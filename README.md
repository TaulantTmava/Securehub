# SecureHub

A professional security toolkit desktop app built with Electron + React (Vite) frontend and Python FastAPI backend.

## Project Structure

```
securehub/
├── frontend/          # Electron + React + Vite
├── backend/           # Python FastAPI
└── README.md
```

## Modules

| Module | Status | Description |
|--------|--------|-------------|
| Nmap | Active | Network discovery and port scanning |
| Hashcat | Linux Only | Password recovery with GPU acceleration |
| Aircrack-ng | Linux Only | WiFi network security assessment |
| Metasploit | Linux Only | Penetration testing framework |
| TheHive | Coming Soon | Security incident response platform |
| BurpSuite | Coming Soon | Web application security testing |

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # Vite dev server only
npm run start      # Vite + Electron together
npm run build      # Production build
```

## Requirements

- Python 3.9+
- Node.js 18+
- nmap installed on system (for scanning)

## API Endpoints

- `GET /` — API health check
- `GET /nmap/scan?target=<host>&args=<nmap-args>` — Run nmap scan
