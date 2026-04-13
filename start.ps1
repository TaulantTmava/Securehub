# Start backend in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd 'C:\Users\Taula\Securehub\backend'
& '.\venv\Scripts\activate.bat'
`$env:PATH += ';C:\Program Files (x86)\Nmap'
uvicorn main:app --reload --port 8000
"@

# Start frontend in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd 'C:\Users\Taula\Securehub\frontend'
npm run start
"@
