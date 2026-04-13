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
    # Step 1: fast path — check if msfconsole binary exists via `which`
    try:
        which_result = subprocess.run(
            ["wsl", "which", "msfconsole"],
            capture_output=True, text=True, timeout=10,
        )
    except FileNotFoundError:
        return {"available": False, "version": None, "error": "WSL not found on this system"}
    except subprocess.TimeoutExpired:
        return {"available": False, "version": None, "error": "Timeout running wsl which msfconsole"}
    except Exception as e:
        return {"available": False, "version": None, "error": str(e)}

    which_path = which_result.stdout.strip()
    if not which_path:
        return {"available": False, "version": None, "error": "msfconsole not found in WSL PATH"}

    # Step 2: try to get version with a 30-second timeout
    try:
        version_result = subprocess.run(
            ["wsl", "msfconsole", "--version"],
            capture_output=True, text=True, timeout=30,
        )
        output = (version_result.stdout + version_result.stderr).strip()
        version = output if output else None
        return {"available": True, "version": version}
    except subprocess.TimeoutExpired:
        # Binary exists but version check timed out — still report available
        return {"available": True, "version": None}
    except Exception:
        return {"available": True, "version": None}


@router.post("/search")
def search(req: SearchRequest):
    if not req.query.strip():
        return {"results": [], "raw_output": "", "error": "Query is empty"}
    # Sanitize query — no shell metacharacters allowed
    forbidden = [";", "|", "&", "`", "$", ">", "<", "\n", "\r", "'", '"', "\\"]
    for ch in forbidden:
        if ch in req.query:
            return {"results": [], "raw_output": "", "error": f"Invalid character in query: {ch!r}"}

    query = req.query.strip()

    # Fast path: grep module files directly — avoids starting msfconsole
    grep_results = _grep_modules(query)
    if grep_results is not None:
        return {"results": grep_results, "raw_output": "", "error": None}

    # Fallback: msfconsole search with generous timeout
    try:
        cmd = ["wsl", "msfconsole", "-q", "-x", f"search {query}; exit"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        raw_output = result.stdout + result.stderr
        results = _parse_msf_search_output(raw_output)
        return {"results": results, "raw_output": raw_output, "error": None}
    except FileNotFoundError:
        return {"results": [], "raw_output": "", "error": "WSL not available on this system"}
    except subprocess.TimeoutExpired:
        return {"results": [], "raw_output": "", "error": "Search timed out (120s)"}
    except Exception as e:
        return {"results": [], "raw_output": "", "error": str(e)}


def _grep_modules(query: str) -> list | None:
    """
    Search Metasploit module files with grep — fast, no msfconsole startup cost.
    Returns a list of result dicts, or None if grep itself failed/unavailable.
    """
    msf_modules_path = "/usr/share/metasploit-framework/modules/"
    try:
        result = subprocess.run(
            ["wsl", "grep", "-ril", query, msf_modules_path, "--include=*.rb"],
            capture_output=True, text=True, timeout=30,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired, Exception):
        return None

    if result.returncode not in (0, 1):
        # Non-zero that isn't "no matches" means grep failed (e.g. path not found)
        return None

    paths = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    if not paths:
        return []

    results = []
    for path in paths:
        # Convert Linux path like:
        # /usr/share/metasploit-framework/modules/exploit/windows/smb/ms17_010_eternalblue.rb
        # → module_type = "exploit", name = "exploit/windows/smb/ms17_010_eternalblue"
        try:
            rel = path.split("/modules/", 1)[1] if "/modules/" in path else path
            name = rel.rstrip(".rb")[:-3] if rel.endswith(".rb") else rel
            parts = name.split("/")
            module_type = parts[0] if parts else ""
        except Exception:
            name = path
            module_type = ""

        results.append({
            "name": name,
            "rank": "",
            "check": "",
            "description": "",
            "raw": path,
            "type": module_type,
        })

    return results


def _parse_msf_search_output(output: str) -> list:
    """Parse msfconsole search output into structured rows."""
    results = []
    lines = output.splitlines()
    header_seen = False
    for line in lines:
        stripped = line.strip()
        if not header_seen:
            if stripped.startswith("#") and "Name" in stripped:
                header_seen = True
            continue
        if stripped.startswith("-") and "----" in stripped:
            continue
        if not stripped:
            continue
        parts = stripped.split()
        if len(parts) < 2:
            continue
        try:
            int(parts[0])
        except ValueError:
            continue
        name = parts[1] if len(parts) > 1 else ""
        rank = ""
        check = ""
        description = ""
        if len(parts) >= 5:
            rank = parts[-3] if len(parts) >= 4 else ""
            check = parts[-2] if len(parts) >= 3 else ""
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
            "type": name.split("/")[0] if "/" in name else "",
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
