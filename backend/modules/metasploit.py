import subprocess
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class SearchRequest(BaseModel):
    query: str


class ScanRequest(BaseModel):
    target: str
    module: str


@router.get("/status")
def status():
    try:
        result = subprocess.run(
            ["wsl", "msfconsole", "--version"],
            capture_output=True, text=True, timeout=30,
        )
        output = (result.stdout + result.stderr).strip()
        if result.returncode == 0 or "Metasploit" in output:
            return {"available": True, "version": output, "wsl": True}
        return {"available": False, "version": None, "wsl": True, "error": output or "msfconsole not found"}
    except FileNotFoundError:
        return {"available": False, "version": None, "wsl": False, "error": "WSL not found on this system"}
    except subprocess.TimeoutExpired:
        return {"available": False, "version": None, "wsl": True, "error": "Timeout checking msfconsole"}
    except Exception as e:
        return {"available": False, "version": None, "wsl": False, "error": str(e)}


@router.post("/search")
def search(req: SearchRequest):
    if not req.query.strip():
        return {"results": [], "raw_output": "", "error": "Query is empty"}
    # Sanitize query
    forbidden = [";", "|", "&", "`", "$", ">", "<", "\n", "\r", "'", '"']
    for ch in forbidden:
        if ch in req.query:
            return {"results": [], "raw_output": "", "error": f"Invalid character in query: {ch!r}"}
    try:
        cmd = ["wsl", "msfconsole", "-q", "-x", f"search {req.query}; exit"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        raw_output = result.stdout + result.stderr
        results = _parse_search_results(raw_output)
        return {"results": results, "raw_output": raw_output, "error": None}
    except FileNotFoundError:
        return {"results": [], "raw_output": "", "error": "WSL not available on this system"}
    except subprocess.TimeoutExpired:
        return {"results": [], "raw_output": "", "error": "Search timed out (90s)"}
    except Exception as e:
        return {"results": [], "raw_output": "", "error": str(e)}


def _parse_search_results(output: str) -> list:
    """Parse msfconsole search output into structured rows."""
    results = []
    lines = output.splitlines()
    header_seen = False
    for line in lines:
        stripped = line.strip()
        # Header line contains "#  Name"
        if not header_seen:
            if stripped.startswith("#") and "Name" in stripped:
                header_seen = True
            continue
        # Skip separator line
        if stripped.startswith("-") and "----" in stripped:
            continue
        if not stripped:
            continue
        # Each result line: #  Name  Date  Rank  Check  Description
        parts = stripped.split()
        if len(parts) < 2:
            continue
        # First part is the index number
        try:
            int(parts[0])
        except ValueError:
            continue
        name = parts[1] if len(parts) > 1 else ""
        # Rank is typically parts[-3], check parts[-2], description the rest after rank
        # Format varies; use heuristic
        rank = ""
        check = ""
        description = ""
        if len(parts) >= 5:
            rank = parts[-3] if len(parts) >= 4 else ""
            check = parts[-2] if len(parts) >= 3 else ""
            # Description: everything between name and rank (after date if present)
            # Skip the index and name
            middle = parts[2:-3]
            description = " ".join(middle)
        elif len(parts) >= 3:
            description = " ".join(parts[2:])
        results.append({
            "name": name,
            "rank": rank,
            "check": check,
            "description": description,
            "raw": stripped,
        })
    return results


@router.post("/scan")
def scan(req: ScanRequest):
    if not req.target.strip() or not req.module.strip():
        return {"output": "", "error": "Target and module are required"}
    # Sanitize inputs
    forbidden = [";", "|", "&", "`", "$", ">", "<", "\n", "\r", "'", '"']
    for val, name in [(req.target, "target"), (req.module, "module")]:
        for ch in forbidden:
            if ch in val:
                return {"output": "", "error": f"Invalid character in {name}: {ch!r}"}
    try:
        commands = f"use {req.module}; set RHOSTS {req.target}; run; exit"
        cmd = ["wsl", "msfconsole", "-q", "-x", commands]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        output = result.stdout + result.stderr
        return {"output": output, "error": None}
    except FileNotFoundError:
        return {"output": "", "error": "WSL not available on this system"}
    except subprocess.TimeoutExpired:
        return {"output": "", "error": "Scan timed out (120s)"}
    except Exception as e:
        return {"output": "", "error": str(e)}
