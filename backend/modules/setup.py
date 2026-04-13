from fastapi import APIRouter
import subprocess
import urllib.request
import tempfile
import os

router = APIRouter()


def check_command(args, timeout=5):
    try:
        subprocess.run(
            args,
            capture_output=True,
            timeout=timeout,
            shell=True,
        )
        return True
    except Exception:
        return False


@router.get("/status")
def get_status():
    return {
        "nmap": check_command("nmap --version"),
        "hashcat": check_command("hashcat --version"),
        "wsl": check_command("wsl --status"),
        "docker": check_command("docker --version"),
        "metasploit": check_command("wsl msfconsole --version", timeout=10),
        "aircrack": check_command("wsl aircrack-ng --help"),
    }


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
