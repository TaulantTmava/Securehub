from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.nmap import router as nmap_router
from modules.hashcat import router as hashcat_router

app = FastAPI(title="SecureHub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nmap_router, prefix="/nmap")
app.include_router(hashcat_router, prefix="/hashcat")


@app.get("/")
def root():
    return {"status": "SecureHub API running"}
