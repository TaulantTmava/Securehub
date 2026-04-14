from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.nmap import router as nmap_router
from modules.hashcat import router as hashcat_router
from modules.thehive import router as thehive_router
from modules.metasploit import router as metasploit_router
from modules.aircrack import router as aircrack_router
from modules.setup import router as setup_router

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
app.include_router(thehive_router, prefix="/thehive")
app.include_router(metasploit_router, prefix="/metasploit")
app.include_router(aircrack_router, prefix="/aircrack")
app.include_router(setup_router, prefix="/setup")


@app.get("/")
def root():
    return {"status": "SecureHub API running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)
