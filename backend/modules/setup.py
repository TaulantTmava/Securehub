from fastapi import APIRouter
import subprocess
import concurrent.futures
import urllib.request
import tempfile
import os

router = APIRouter()


def check_command(cmd, timeout=3):
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=timeout, shell=True)
        return result.returncode == 0
    except:
        return False


@router.get("/status")
def get_status():
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {
            "nmap":      executor.submit(check_command, "nmap --version", 3),
            "hashcat":   executor.submit(check_command, "hashcat --version", 3),
            "wsl":       executor.submit(check_command, "wsl --status", 3),
            "docker":    executor.submit(check_command, "docker --version", 3),
            "metasploit": executor.submit(check_command, "wsl which msfconsole", 5),
            "aircrack":  executor.submit(check_command, "wsl which aircrack-ng", 5),
        }
        return {k: v.result(timeout=6) for k, v in futures.items()}


@router.post("/install/nmap")
def install_nmap():
    try:
        url = "https://nmap.org/dist/nmap-7.95-setup.exe"
        tmp = tempfile.mktemp(suffix="-nmap-setup.exe")
        urllib.request.urlretrieve(url, tmp)
        subprocess.Popen([tmp, "/S"])
        return {"status": "installing"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


@router.post("/install/hashcat")
def install_hashcat():
    try:
        import py7zr
        url = "https://hashcat.net/files/hashcat-6.2.6.7z"
        tmp = tempfile.mktemp(suffix="-hashcat.7z")
        urllib.request.urlretrieve(url, tmp)
        dest = r"C:\hashcat"
        os.makedirs(dest, exist_ok=True)
        with py7zr.SevenZipFile(tmp, mode="r") as z:
            z.extractall(path=dest)
        extracted = os.path.join(dest, "hashcat-6.2.6")
        os.environ["PATH"] += f";{extracted}"
        return {"status": "done"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}
