import re
import shutil
import subprocess
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

HASH_PATTERNS = [
    {"name": "MD5", "hashcat_code": 0, "regex": r"^[a-fA-F0-9]{32}$"},
    {"name": "MD5(Unix)", "hashcat_code": 500, "regex": r"^\$1\$.{1,8}\$.{22}$"},
    {"name": "SHA-1", "hashcat_code": 100, "regex": r"^[a-fA-F0-9]{40}$"},
    {"name": "SHA-256", "hashcat_code": 1400, "regex": r"^[a-fA-F0-9]{64}$"},
    {"name": "SHA-512", "hashcat_code": 1700, "regex": r"^[a-fA-F0-9]{128}$"},
    {"name": "SHA-384", "hashcat_code": 10800, "regex": r"^[a-fA-F0-9]{96}$"},
    {"name": "NTLM", "hashcat_code": 1000, "regex": r"^[a-fA-F0-9]{32}$"},
    {"name": "bcrypt", "hashcat_code": 3200, "regex": r"^\$2[ayb]\$.{56}$"},
    {"name": "WPA-PBKDF2-PMKID+EAPOL", "hashcat_code": 22000, "regex": r"^[a-fA-F0-9]{32}\*[a-fA-F0-9]{12}\*[a-fA-F0-9]{12}\*"},
    {"name": "MySQL4.1/MySQL5+", "hashcat_code": 300, "regex": r"^\*[a-fA-F0-9]{40}$"},
    {"name": "sha256crypt", "hashcat_code": 7400, "regex": r"^\$5\$.{0,16}\$.{43}$"},
    {"name": "sha512crypt", "hashcat_code": 1800, "regex": r"^\$6\$.{0,16}\$.{86}$"},
    {"name": "MD4", "hashcat_code": 900, "regex": r"^[a-fA-F0-9]{32}$"},
    {"name": "LM", "hashcat_code": 3000, "regex": r"^[a-fA-F0-9]{32}$"},
    {"name": "Whirlpool", "hashcat_code": 6100, "regex": r"^[a-fA-F0-9]{128}$"},
    {"name": "RIPEMD-160", "hashcat_code": 6000, "regex": r"^[a-fA-F0-9]{40}$"},
    {"name": "Django (SHA-1)", "hashcat_code": 124, "regex": r"^sha1\$.+\$[a-fA-F0-9]{40}$"},
    {"name": "Cisco-IOS $8$", "hashcat_code": 9200, "regex": r"^\$8\$.{14}\$.{43}$"},
    {"name": "Cisco-IOS $9$", "hashcat_code": 9300, "regex": r"^\$9\$.{14}\$.{43}$"},
    {"name": "Drupal7", "hashcat_code": 7900, "regex": r"^\$S\$.{52}$"},
    {"name": "WordPress (phpass)", "hashcat_code": 400, "regex": r"^\$P\$.{31}$"},
]


class CrackRequest(BaseModel):
    hash: str
    hashtype: int
    wordlist: str = "rockyou.txt"


@router.post("/crack")
def crack_hash(req: CrackRequest):
    hashcat_path = shutil.which("hashcat")
    if hashcat_path is None:
        raise HTTPException(
            status_code=503,
            detail="hashcat_not_found",
        )

    cmd = [
        hashcat_path,
        "-m", str(req.hashtype),
        req.hash.strip(),
        req.wordlist,
        "--potfile-disable",
        "--quiet",
        "--outfile-format=2",
        "-O",
    ]

    start = time.time()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Hashcat timed out after 5 minutes")
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="hashcat_not_found")

    elapsed = round(time.time() - start, 2)

    # hashcat exit code 0 = cracked, 1 = exhausted (not found), 255 = error
    if proc.returncode == 0 and proc.stdout.strip():
        return {
            "status": "cracked",
            "result": proc.stdout.strip(),
            "time_elapsed": elapsed,
        }
    elif proc.returncode in (0, 1):
        return {
            "status": "failed",
            "result": None,
            "time_elapsed": elapsed,
        }
    else:
        err = proc.stderr.strip() or proc.stdout.strip() or "Unknown hashcat error"
        raise HTTPException(status_code=500, detail=err)


@router.get("/identify")
def identify_hash(hash: str):
    hash = hash.strip()
    matches = []
    seen_codes = set()

    for pattern in HASH_PATTERNS:
        if re.match(pattern["regex"], hash):
            code = pattern["hashcat_code"]
            if code not in seen_codes:
                seen_codes.add(code)
                matches.append({
                    "name": pattern["name"],
                    "hashcat_code": code,
                })

    return {"possible_types": matches}
