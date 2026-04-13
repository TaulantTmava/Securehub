# SecureHub

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Electron](https://img.shields.io/badge/Electron-27-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

A unified security toolkit desktop application built with **Electron + React + Python FastAPI**. SecureHub brings together industry-standard security tools into one clean, professional interface — built for security professionals and students alike.

---

## Overview

SecureHub is a desktop application that integrates multiple industry-standard security tools into one unified interface. Instead of juggling separate terminals and GUIs for each tool, SecureHub provides a single pane of glass for the most common tasks in network analysis, password auditing, web testing, incident response, and wireless security.

---

## Features

| Module | Tool | Description |
|---|---|---|
| Network Scanner | **Nmap** | Network discovery and port scanning |
| Hash Cracker | **Hashcat** | Password hash identification and cracking |
| Incident Management | **TheHive** | Security incident case management (via Docker) |
| Penetration Testing | **Metasploit** | Full-featured exploitation framework (via WSL2) |
| WiFi Analysis | **Aircrack-ng** | WPA/WPA2 wireless security auditing (via WSL2) |
| Web Testing | **BurpSuite** | Web application security testing *(coming soon)* |

---

## Tech Stack

```
Frontend    │ Electron 27 · React 18 · Vite 5 · React Router 6
Backend     │ Python 3.10+ · FastAPI · Uvicorn
Docker      │ TheHive 5 · Cassandra 4
WSL2        │ Metasploit Framework · Aircrack-ng (Ubuntu)
```

---

## Prerequisites

Before installing, make sure you have the following on your **Windows 10/11** machine:

- **WSL2** — enabled with an Ubuntu distro
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Python 3.10+** — [python.org](https://python.org)
- **Docker Desktop** — [docker.com](https://docker.com) (required for TheHive)
- **Nmap** — [nmap.org](https://nmap.org/download.html) (Windows installer, added to PATH)
- **Metasploit Framework** — installed inside WSL2 Ubuntu
- **Aircrack-ng** — installed inside WSL2 Ubuntu

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/TaulantTmava/Securehub.git
cd Securehub
```

### 2. Set up the Python backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Set up the frontend

```bash
cd frontend
npm install
```

### 4. Start TheHive (Docker)

Make sure Docker Desktop is running, then from the project root:

```bash
docker compose up -d
```

TheHive will be available at `http://localhost:9000` (default credentials: `admin@thehive.local` / `secret`).

### 5. Install Metasploit & Aircrack-ng (WSL2)

Open your WSL2 Ubuntu terminal:

```bash
# Metasploit
curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > msfinstall
chmod 755 msfinstall && sudo ./msfinstall

# Aircrack-ng
sudo apt update && sudo apt install -y aircrack-ng
```

---

## Usage

### Start the app

From the project root, run the provided PowerShell script:

```powershell
.\start.ps1
```

This will:
1. Launch the **FastAPI backend** (`http://localhost:8000`) in a new terminal window
2. Launch the **Electron + React frontend** in a separate terminal window

The desktop app window will open automatically.

### Stop the app

```powershell
.\stop.ps1
```

---

## Project Structure

```
Securehub/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── requirements.txt
│   └── modules/
│       ├── nmap.py          # Nmap integration
│       ├── hashcat.py       # Hashcat integration
│       ├── thehive.py       # TheHive API client
│       ├── metasploit.py    # Metasploit via WSL2
│       └── aircrack.py      # Aircrack-ng via WSL2
├── frontend/
│   ├── main.js              # Electron main process
│   ├── src/                 # React components
│   └── vite.config.js
├── docker-compose.yml       # TheHive + Cassandra
├── start.ps1                # One-click start script
└── stop.ps1                 # One-click stop script
```

---

## Screenshots

> Screenshots will be added in a future update.

---

## Legal Disclaimer

> **This tool is intended for authorized security testing and educational purposes only.**
>
> The author assumes no liability and is not responsible for any misuse or damage caused by this program. Users are responsible for obtaining proper written authorization before testing any systems, networks, or applications they do not own. Unauthorized access to computer systems is illegal and punishable by law.

---

## Author

**Taulant Tmava** — IT Security Student at EC Utbildning

---

*Built for learning. Use responsibly.*
