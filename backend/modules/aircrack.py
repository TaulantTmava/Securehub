import subprocess
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class AnalyzeRequest(BaseModel):
    capture_file: str


@router.get("/status")
def status():
    try:
        result = subprocess.run(
            ["wsl", "aircrack-ng", "--help"],
            capture_output=True, text=True, timeout=10,
        )
        output = result.stdout + result.stderr
        if "Aircrack-ng" in output or "aircrack-ng" in output.lower():
            # Try to get version string
            ver_result = subprocess.run(
                ["wsl", "aircrack-ng", "--version"],
                capture_output=True, text=True, timeout=10,
            )
            version = (ver_result.stdout + ver_result.stderr).strip()
            return {"available": True, "version": version or "installed", "wsl": True}
        return {"available": False, "version": None, "wsl": True, "error": "aircrack-ng not found in WSL"}
    except FileNotFoundError:
        return {"available": False, "version": None, "wsl": False, "error": "WSL not found on this system"}
    except subprocess.TimeoutExpired:
        return {"available": False, "version": None, "wsl": True, "error": "Timeout checking aircrack-ng"}
    except Exception as e:
        return {"available": False, "version": None, "wsl": False, "error": str(e)}


@router.get("/interfaces")
def interfaces():
    try:
        result = subprocess.run(
            ["wsl", "aircrack-ng", "--help"],
            capture_output=True, text=True, timeout=10,
        )
        output = result.stdout + result.stderr
        available = "Aircrack-ng" in output or "aircrack" in output.lower()
        return {"output": output, "available": available}
    except FileNotFoundError:
        return {"output": "", "available": False, "error": "WSL not found on this system"}
    except subprocess.TimeoutExpired:
        return {"output": "", "available": False, "error": "Timeout"}
    except Exception as e:
        return {"output": "", "available": False, "error": str(e)}


@router.post("/analyze")
def analyze(req: AnalyzeRequest):
    if not req.capture_file.strip():
        return {"output": "", "error": "Capture file path is required"}
    capture_file = req.capture_file.strip()
    # Sanitize: reject shell metacharacters
    forbidden = [";", "|", "&", "`", "$", ">", "<", "\n", "\r"]
    for ch in forbidden:
        if ch in capture_file:
            return {"output": "", "error": f"Invalid character in file path: {ch!r}"}
    try:
        cmd = ["wsl", "aircrack-ng", capture_file]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        output = result.stdout + result.stderr
        return {"output": output, "error": None}
    except FileNotFoundError:
        return {"output": "", "error": "WSL not available on this system"}
    except subprocess.TimeoutExpired:
        return {"output": "", "error": "Analysis timed out (120s)"}
    except Exception as e:
        return {"output": "", "error": str(e)}
