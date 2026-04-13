const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')

// ── Paths ────────────────────────────────────────────────────────────────────

const isDev = !app.isPackaged

const BACKEND_DIR = isDev
  ? path.join(__dirname, '..', 'backend')
  : path.join(process.resourcesPath, 'backend')

const LOG_DIR = isDev
  ? path.join(__dirname, '..', 'logs')
  : path.join(app.getPath('userData'), 'logs')

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })

const LOG_FILE = path.join(LOG_DIR, 'backend.log')
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' })

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  logStream.write(line)
  if (isDev) process.stdout.write(line)
}

// ── Backend process ──────────────────────────────────────────────────────────

let backendProc = null

function buildEnv() {
  const env = { ...process.env }
  // Ensure Nmap is on PATH so the backend can call it
  const nmapDir = 'C:\\Program Files (x86)\\Nmap'
  if (!env.PATH.includes(nmapDir)) {
    env.PATH = nmapDir + ';' + env.PATH
  }
  return env
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const env = buildEnv()

    let cmd, args, opts

    if (isDev) {
      cmd = 'uvicorn'
      args = ['main:app', '--port', '8000']
      opts = { cwd: BACKEND_DIR, env, shell: true }
    } else {
      // In production use the Python bundled alongside the backend
      const pythonExe = path.join(BACKEND_DIR, 'python', 'python.exe')
      const hasBundledPython = fs.existsSync(pythonExe)

      if (hasBundledPython) {
        cmd = pythonExe
        args = ['-m', 'uvicorn', 'main:app', '--port', '8000']
      } else {
        // Fall back to system Python
        cmd = 'python'
        args = ['-m', 'uvicorn', 'main:app', '--port', '8000']
      }
      opts = { cwd: BACKEND_DIR, env, shell: true }
    }

    log(`Starting backend: ${cmd} ${args.join(' ')} (cwd: ${BACKEND_DIR})`)

    backendProc = spawn(cmd, args, opts)

    backendProc.stdout.on('data', d => log(`[backend] ${d.toString().trim()}`))
    backendProc.stderr.on('data', d => log(`[backend:err] ${d.toString().trim()}`))

    backendProc.on('error', err => {
      log(`Backend spawn error: ${err.message}`)
      reject(err)
    })

    backendProc.on('exit', (code, signal) => {
      log(`Backend exited (code=${code} signal=${signal})`)
    })

    // Poll until ready or timeout
    const deadline = Date.now() + 30_000
    const interval = setInterval(() => {
      http.get('http://localhost:8000', res => {
        if (res.statusCode < 500) {
          clearInterval(interval)
          log('Backend is ready.')
          resolve()
        }
      }).on('error', () => {
        if (Date.now() > deadline) {
          clearInterval(interval)
          reject(new Error('Backend did not start within 30 seconds.'))
        }
      })
    }, 500)
  })
}

function killBackend() {
  if (backendProc && !backendProc.killed) {
    log('Killing backend process…')
    backendProc.kill()
  }
}

// ── Loading window ───────────────────────────────────────────────────────────

function createLoadingWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 240,
    backgroundColor: '#0a0a0f',
    frame: false,
    resizable: false,
    center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })

  win.loadURL(`data:text/html,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #0a0a0f;
          color: #e2e8f0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 20px;
        }
        .logo { font-size: 28px; font-weight: 700; color: #d4351c; letter-spacing: 1px; }
        .msg  { font-size: 14px; color: #94a3b8; }
        .spinner {
          width: 32px; height: 32px;
          border: 3px solid #1e293b;
          border-top-color: #d4351c;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="logo">SecureHub</div>
      <div class="spinner"></div>
      <div class="msg">Starting SecureHub…</div>
    </body>
    </html>
  `)}`)

  return win
}

// ── Main window ──────────────────────────────────────────────────────────────

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
    icon: path.join(__dirname, isDev ? 'public' : '', 'icon.ico'),
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }

  win.setMenuBarVisibility(false)
  return win
}

// ── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  const loader = createLoadingWindow()

  try {
    await startBackend()
  } catch (err) {
    loader.close()
    await dialog.showMessageBox({
      type: 'error',
      title: 'SecureHub — Backend Failed',
      message: 'The backend could not be started.',
      detail:
        `${err.message}\n\n` +
        `Log file: ${LOG_FILE}\n\n` +
        'Make sure Python and uvicorn are installed:\n' +
        '  pip install uvicorn fastapi',
      buttons: ['Quit'],
    })
    app.quit()
    return
  }

  const mainWin = createMainWindow()

  mainWin.once('ready-to-show', () => {
    loader.close()
    mainWin.show()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('quit', killBackend)
