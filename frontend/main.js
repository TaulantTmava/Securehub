const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')

// ── Catch unhandled errors so Electron never exits silently ──────────────────

process.on('uncaughtException', err => {
  console.error('Uncaught exception:', err)
  dialog.showErrorBox('SecureHub — Unexpected Error', err.stack || err.message)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

// ── Paths ────────────────────────────────────────────────────────────────────

const isDev = !app.isPackaged

const BACKEND_DIR = isDev
  ? path.join(__dirname, '..', 'backend')
  : path.join(process.resourcesPath, 'backend')

const LOG_DIR = isDev
  ? path.join(__dirname, '..', 'logs')
  : path.join(app.getPath('userData'), 'logs')

try {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
} catch (_) {}

const LOG_FILE = path.join(LOG_DIR, 'backend.log')
let logStream
try {
  logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' })
} catch (_) {}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  if (logStream) logStream.write(line)
  console.log(msg)
}

// ── Backend process ──────────────────────────────────────────────────────────

let backendProc = null

function buildEnv() {
  const env = { ...process.env }
  const nmapDir = 'C:\\Program Files (x86)\\Nmap'
  if (env.PATH && !env.PATH.includes(nmapDir)) {
    env.PATH = nmapDir + ';' + env.PATH
  }
  return env
}

function startBackend() {
  return new Promise((resolve, reject) => {
    let settled = false
    let pollInterval = null

    function done(err) {
      if (settled) return
      settled = true
      if (pollInterval) clearInterval(pollInterval)
      if (err) reject(err)
      else resolve()
    }

    const env = buildEnv()
    let cmd, args, opts

    if (isDev) {
      // Use venv Python directly to avoid activation issues
      cmd = 'C:\\Users\\Taula\\Securehub\\backend\\venv\\Scripts\\python.exe'
      args = ['-m', 'uvicorn', 'main:app', '--port', '8765']
      opts = { cwd: 'C:\\Users\\Taula\\Securehub\\backend', env, shell: false }
    } else {
      // Production: use the self-contained PyInstaller exe bundled in resources
      cmd = path.join(process.resourcesPath, 'securehub-backend.exe')
      args = []
      opts = { cwd: process.resourcesPath, env, shell: false }
    }

    log(`Starting backend: ${cmd} ${args.join(' ')} (cwd: ${BACKEND_DIR})`)

    try {
      backendProc = spawn(cmd, args, opts)
    } catch (spawnErr) {
      return done(spawnErr)
    }

    backendProc.stdout && backendProc.stdout.on('data', d => log(`[backend] ${d.toString().trim()}`))
    backendProc.stderr && backendProc.stderr.on('data', d => log(`[backend:err] ${d.toString().trim()}`))

    backendProc.on('error', err => {
      log(`Backend spawn error: ${err.message}`)
      done(err)
    })

    backendProc.on('exit', (code, signal) => {
      log(`Backend exited (code=${code} signal=${signal})`)
      if (!settled) {
        done(new Error(`Backend process exited unexpectedly (code=${code})`))
      }
    })

    // Poll until ready or 30s timeout
    const deadline = Date.now() + 30_000
    let pollCount = 0
    pollInterval = setInterval(() => {
      pollCount++
      log(`Health check #${pollCount} → http://127.0.0.1:8765`)
      const req = http.get('http://127.0.0.1:8765', res => {
        res.resume() // consume response to free socket
        log(`Health check #${pollCount} ← HTTP ${res.statusCode}`)
        if (res.statusCode < 500) {
          log('Backend is ready.')
          done(null)
        }
      })
      req.on('error', err => {
        log(`Health check #${pollCount} ← error: ${err.message}`)
        if (Date.now() > deadline) {
          done(new Error('Backend did not start within 30 seconds.\n\nCheck log: ' + LOG_FILE))
        }
      })
      req.setTimeout(400, () => {
        log(`Health check #${pollCount} ← timeout`)
        req.destroy()
      })
    }, 500)
  })
}

function killBackend() {
  if (backendProc && !backendProc.killed) {
    log('Killing backend process…')
    try { backendProc.kill() } catch (_) {}
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

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0f; color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 100vh; gap: 20px;
    }
    .logo { font-size: 28px; font-weight: 700; color: #d4351c; letter-spacing: 1px; }
    .msg  { font-size: 14px; color: #94a3b8; }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid #1e293b; border-top-color: #d4351c;
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
</html>`

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  return win
}

// ── Main window ──────────────────────────────────────────────────────────────

const DEV_URL = 'http://localhost:5174'

function createMainWindow() {
  const iconPath = isDev ? path.join(__dirname, 'public', 'icon.ico') : undefined
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    titleBarStyle: 'default',
    ...(iconPath ? { icon: iconPath } : {}),
  })

  if (isDev) {
    win.loadURL(DEV_URL)
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }

  win.setMenuBarVisibility(false)
  return win
}

// ── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  const loader = createLoadingWindow()

  let backendOk = false
  try {
    await startBackend()
    backendOk = true
  } catch (err) {
    log(`Backend failed: ${err.message}`)

    // Hide loader but keep it alive so window-all-closed doesn't fire before dialog
    loader.hide()

    await dialog.showMessageBox({
      type: 'error',
      title: 'SecureHub — Backend Failed',
      message: 'The backend could not be started.',
      detail:
        `${err.message}\n\n` +
        `Log: ${LOG_FILE}\n\n` +
        'Make sure Python and uvicorn are installed:\n' +
        '  pip install uvicorn fastapi',
      buttons: ['Continue Anyway', 'Quit'],
    }).then(({ response }) => {
      if (response === 1) {
        app.quit()
      }
    })

    if (app.isQuiting) return
  }

  const mainWin = createMainWindow()

  mainWin.once('ready-to-show', () => {
    if (!loader.isDestroyed()) loader.close()
    mainWin.show()
  })

  // Fallback: if ready-to-show never fires, open after 10s
  setTimeout(() => {
    if (!loader.isDestroyed()) loader.close()
    if (!mainWin.isDestroyed() && !mainWin.isVisible()) mainWin.show()
  }, 10_000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('quit', () => {
  app.isQuiting = true
  killBackend()
})
