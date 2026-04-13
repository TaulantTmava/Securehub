from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

router = APIRouter()

# In-memory connection config
_config: dict = {"url": None, "api_key": None}


def _headers() -> dict:
    if not _config["api_key"]:
        raise HTTPException(status_code=400, detail="Not connected. Call POST /thehive/connect first.")
    return {
        "Authorization": f"Bearer {_config['api_key']}",
        "Content-Type": "application/json",
    }


def _base() -> str:
    if not _config["url"]:
        raise HTTPException(status_code=400, detail="Not connected. Call POST /thehive/connect first.")
    return _config["url"].rstrip("/")


# ── Models ────────────────────────────────────────────────────────────────────

class ConnectRequest(BaseModel):
    url: str
    api_key: str


class CreateCaseRequest(BaseModel):
    title: str
    description: str
    severity: int = 2          # 1=Low 2=Medium 3=High
    tags: List[str] = []


class CreateAlertRequest(BaseModel):
    title: str
    description: str
    severity: int = 2
    source: str
    sourceRef: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/connect")
def connect(req: ConnectRequest):
    url = req.url.rstrip("/")
    headers = {
        "Authorization": f"Bearer {req.api_key}",
        "Content-Type": "application/json",
    }
    try:
        resp = httpx.get(f"{url}/api/status", headers=headers, timeout=10)
        if resp.status_code == 401:
            return {"status": "failed", "version": None, "detail": "Invalid API key"}
        if resp.status_code >= 400:
            return {
                "status": "failed",
                "version": None,
                "detail": f"Server returned {resp.status_code}",
            }
        data = resp.json()
        version = (
            data.get("versions", {}).get("TheHive")
            or data.get("version")
            or "unknown"
        )
        # Persist config only on success
        _config["url"] = url
        _config["api_key"] = req.api_key
        return {"status": "connected", "version": version}
    except httpx.ConnectError:
        return {"status": "failed", "version": None, "detail": "Could not reach TheHive at that URL"}
    except httpx.TimeoutException:
        return {"status": "failed", "version": None, "detail": "Connection timed out"}
    except Exception as e:
        return {"status": "failed", "version": None, "detail": str(e)}


@router.get("/cases")
def get_cases():
    try:
        resp = httpx.post(
            f"{_base()}/api/v1/query",
            headers=_headers(),
            json={"query": [{"_name": "listCase"}]},
            timeout=15,
        )
        resp.raise_for_status()
        raw = resp.json()
        cases = []
        for c in raw:
            cases.append({
                "id": c.get("_id") or c.get("id", ""),
                "caseId": c.get("caseId", ""),
                "title": c.get("title", ""),
                "severity": c.get("severity", 2),
                "status": c.get("status", ""),
                "createdAt": c.get("_createdAt") or c.get("createdAt", 0),
            })
        return {"cases": cases}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cases")
def create_case(req: CreateCaseRequest):
    payload = {
        "title": req.title,
        "description": req.description,
        "severity": req.severity,
        "tags": req.tags,
    }
    try:
        resp = httpx.post(
            f"{_base()}/api/v1/case",
            headers=_headers(),
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "status": "created",
            "id": data.get("_id") or data.get("id", ""),
            "caseId": data.get("caseId", ""),
        }
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts")
def create_alert(req: CreateAlertRequest):
    payload = {
        "title": req.title,
        "description": req.description,
        "severity": req.severity,
        "source": req.source,
        "sourceRef": req.sourceRef,
        "type": "external",
    }
    try:
        resp = httpx.post(
            f"{_base()}/api/v1/alert",
            headers=_headers(),
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "status": "created",
            "id": data.get("_id") or data.get("id", ""),
        }
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
