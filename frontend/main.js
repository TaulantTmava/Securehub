const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')
const net = require('net')
const os = require('os')

// ── Unhandled error safety net ────────────────────────────────────────────────
process.on('uncaughtException', err => {
  console.error('Uncaught exception:', err)
  try { dialog.showErrorBox('SecureHub — Unexpected Error', err.stack || err.message) } catch (_) {}
})
process.on('unhandledRejection', reason => console.error('Unhandled rejection:', reason))
process.on('SIGTERM', () => { cleanup(); app.quit() })
process.on('SIGINT',  () => { cleanup(); app.quit() })

// ── Paths ─────────────────────────────────────────────────────────────────────
const isDev = !app.isPackaged

const LOG_DIR = isDev
  ? path.join(__dirname, '..', 'logs')
  : path.join(app.getPath('userData'), 'logs')

const LOG_FILE  = path.join(LOG_DIR, 'backend.log')
const LOCK_FILE = path.join(app.getPath('userData'), 'backend.lock')
const PORT_FILE = path.join(os.tmpdir(), 'securehub_port.txt')

try { if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true }) } catch (_) {}

let logStream
try { logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' }) } catch (_) {}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  if (logStream) logStream.write(line)
  console.log(msg)
}

// ── Port helpers ──────────────────────────────────────────────────────────────
function findFreePort(start = 8765, max = 8800) {
  return new Promise((resolve, reject) => {
    if (start > max) return reject(new Error('No free port available in range 8765–8800'))
    const srv = net.createServer()
    srv.listen(start, '127.0.0.1', () => {
      const p = srv.address().port
      srv.close(() => resolve(p))
    })
    srv.on('error', () => findFreePort(start + 1, max).then(resolve, reject))
  })
}

function writePort(port) {
  try { fs.writeFileSync(PORT_FILE, String(port)) } catch (e) { log(`Port file write error: ${e.message}`) }
}
function deletePort() { try { fs.unlinkSync(PORT_FILE) } catch (_) {} }

// ── Lock file — single backend instance ──────────────────────────────────────
function killExistingBackend() {
  try {
    if (!fs.existsSync(LOCK_FILE)) return
    const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10)
    if (!pid) return
    try {
      process.kill(pid, 0)             // throws ESRCH if not running
      log(`Killing stale backend PID ${pid}`)
      process.kill(pid)
    } catch (e) {
      if (e.code !== 'ESRCH') log(`Could not kill PID ${pid}: ${e.message}`)
    }
  } catch (_) {}
  deleteLock()
}

function writeLock(pid) { try { fs.writeFileSync(LOCK_FILE, String(pid)) } catch (_) {} }
function deleteLock()    { try { fs.unlinkSync(LOCK_FILE) }                catch (_) {} }

// ── Loading screen progress ───────────────────────────────────────────────────
function setProgress(loaderWin, msg) {
  if (!loaderWin || loaderWin.isDestroyed()) return
  loaderWin.webContents
    .executeJavaScript(`(function(){ var el=document.getElementById('pmsg'); if(el) el.textContent=${JSON.stringify(msg)}; })()`)
    .catch(() => {})
}

// ── Backend process ───────────────────────────────────────────────────────────
let backendProc  = null
let backendPort  = 8765
let restartCount = 0
const MAX_RESTARTS = 3
let appQuitting  = false
let loaderWinRef = null   // kept for crash-restart progress messages

function buildEnv(port) {
  const env = { ...process.env, PORT: String(port) }
  const nmapDir = 'C:\\Program Files (x86)\\Nmap'
  if (env.PATH && !env.PATH.includes(nmapDir)) env.PATH = nmapDir + ';' + env.PATH
  return env
}

function startBackend(port, loaderWin) {
  return new Promise((resolve, reject) => {
    let settled = false
    let pollInterval = null

    function done(err) {
      if (settled) return
      settled = true
      clearInterval(pollInterval)
      err ? reject(err) : resolve()
    }

    const env  = buildEnv(port)
    let cmd, args, opts

    if (isDev) {
      cmd  = path.join(__dirname, '..', 'backend', 'venv', 'Scripts', 'python.exe')
      args = ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(port)]
      opts = { cwd: path.join(__dirname, '..', 'backend'), env, shell: false }
    } else {
      cmd  = path.join(process.resourcesPath, 'securehub-backend.exe')
      args = []
      opts = { cwd: process.resourcesPath, env, shell: false }
    }

    log(`Starting backend: ${cmd} on port ${port}`)
    setProgress(loaderWin, 'Starting backend...')

    try {
      backendProc = spawn(cmd, args, opts)
    } catch (spawnErr) {
      return done(spawnErr)
    }

    writeLock(backendProc.pid)
    log(`Backend PID: ${backendProc.pid}`)

    backendProc.stdout?.on('data', d => log(`[backend] ${d.toString().trim()}`))
    backendProc.stderr?.on('data', d => log(`[backend:err] ${d.toString().trim()}`))

    backendProc.on('error', err => { log(`Backend spawn error: ${err.message}`); done(err) })

    backendProc.on('exit', (code, signal) => {
      log(`Backend exited (code=${code} signal=${signal})`)
      deleteLock()
      if (!settled) {
        done(new Error(`Backend exited unexpectedly (code=${code})\n\nLog: ${LOG_FILE}`))
      } else if (!appQuitting) {
        handleBackendCrash(code)
      }
    })

    // Health-check poll — 45 s deadline
    const deadline = Date.now() + 45_000
    let pollCount  = 0
    pollInterval   = setInterval(() => {
      pollCount++
      if (pollCount % 6 === 0) setProgress(loaderWin, `Connecting to backend… (${Math.round(pollCount / 2)}s)`)

      const req = http.get(`http://127.0.0.1:${port}`, res => {
        res.resume()
        log(`Health check #${pollCount} ← HTTP ${res.statusCode}`)
        if (res.statusCode < 500) {
          log(`Backend ready on port ${port}`)
          setProgress(loaderWin, 'Ready!')
          done(null)
        }
      })
      req.on('error', () => {
        if (Date.now() > deadline) {
          done(new Error(`Backend did not respond within 45 seconds.\n\nLog: ${LOG_FILE}`))
        }
      })
      req.setTimeout(400, () => req.destroy())
    }, 500)
  })
}

function handleBackendCrash(code) {
  if (restartCount >= MAX_RESTARTS) {
    let logTail = ''
    try {
      const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n')
      logTail = lines.slice(-40).join('\n')
    } catch (_) {}
    dialog.showErrorBox(
      'SecureHub — Backend Crashed',
      `Backend crashed (code=${code}) after ${MAX_RESTARTS} restart attempts.\n\nLast log:\n${logTail}`
    )
    return
  }
  restartCount++
  log(`Auto-restarting backend (attempt ${restartCount}/${MAX_RESTARTS})`)
  setTimeout(() => {
    startBackend(backendPort, loaderWinRef).catch(err =>
      log(`Restart ${restartCount} failed: ${err.message}`)
    )
  }, 1500)
}

function killBackend() {
  if (!backendProc || backendProc.killed) return
  log('Sending SIGTERM to backend...')
  try { backendProc.kill('SIGTERM') } catch (_) {}
  // Force-kill after 5 s
  setTimeout(() => {
    try { if (backendProc && !backendProc.killed) { log('Force-killing backend'); backendProc.kill('SIGKILL') } } catch (_) {}
  }, 5000)
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
function cleanup() {
  if (appQuitting) return
  appQuitting = true
  log('App quitting — cleaning up')
  killBackend()
  deleteLock()
  deletePort()
}

// ── System dependency checks ──────────────────────────────────────────────────
function checkDependencies() {
  if (process.platform !== 'win32') return
  const sysroot = process.env.SystemRoot || 'C:\\Windows'
  const vcrt    = path.join(sysroot, 'System32', 'vcruntime140.dll')
  if (!fs.existsSync(vcrt)) {
    dialog.showMessageBoxSync({
      type: 'warning',
      title: 'SecureHub — Missing Runtime',
      message: 'Visual C++ Redistributable may be missing',
      detail:
        'vcruntime140.dll was not found in System32.\n\n' +
        'If SecureHub fails to start, install the Microsoft Visual C++ ' +
        'Redistributable (2015–2022) from:\n' +
        'https://aka.ms/vs/17/release/vc_redist.x64.exe',
      buttons: ['OK'],
    })
  }
}

// ── Loading window ────────────────────────────────────────────────────────────
function createLoadingWindow() {
  const win = new BrowserWindow({
    width: 400, height: 260,
    backgroundColor: '#0a0a0f',
    frame: false, resizable: false, center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0a0f;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:18px}
    .logo{font-size:28px;font-weight:700;color:#d4351c;letter-spacing:1px}
    .spinner{width:32px;height:32px;border:3px solid #1e293b;border-top-color:#d4351c;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    #pmsg{font-size:13px;color:#94a3b8}
  </style></head><body>
    <div class="logo">SecureHub</div>
    <div class="spinner"></div>
    <div id="pmsg">Starting SecureHub…</div>
  </body></html>`

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  return win
}

// ── Main window ───────────────────────────────────────────────────────────────
const DEV_URL = 'http://localhost:5173'

function getIndexPath() {
  const primary  = path.join(__dirname, 'dist', 'index.html')
  const fallback = path.join(process.resourcesPath || '', 'app.asar', 'dist', 'index.html')
  return fs.existsSync(primary) ? primary : fallback
}

function loadWindow(win) {
  if (isDev) {
    log(`loadURL → ${DEV_URL}`)
    win.loadURL(DEV_URL).catch(e => log(`loadURL error: ${e.message}`))
  } else {
    const p = getIndexPath()
    log(`loadFile → ${p}`)
    win.loadFile(p).catch(e => log(`loadFile error: ${e.message}`))
  }
}

function createMainWindow() {
  const iconPath = isDev ? path.join(__dirname, 'public', 'icon.ico') : undefined

  const win = new BrowserWindow({
    width: 1280, height: 800,
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'default',
    ...(iconPath ? { icon: iconPath } : {}),
  })

  win.once('ready-to-show', () => {
    log('Main window ready-to-show → show()')
    win.show()
  })

  let loadRetries = 0
  win.webContents.on('did-fail-load', (event, code, desc, url) => {
    log(`Window load failed (${code} ${desc}) url=${url}`)
    if (loadRetries < 3 && !win.isDestroyed()) {
      loadRetries++
      log(`Retrying window load in 1s (attempt ${loadRetries}/3)`)
      setTimeout(() => loadWindow(win), 1000)
    }
  })

  win.webContents.on('dom-ready', () => log('Window dom-ready'))

  // DevTools only in dev mode — remove before shipping
  if (isDev) win.webContents.openDevTools()

  loadWindow(win)
  win.setMenuBarVisibility(false)
  return win
}

// ── IPC: renderer can query the backend port ──────────────────────────────────
ipcMain.handle('get-backend-port', () => backendPort)

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  checkDependencies()

  const loader = createLoadingWindow()
  loaderWinRef  = loader

  try {
    // Problem 3: kill any leftover backend from a previous session
    killExistingBackend()

    // Problem 1: find a free port, write it for the preload to read
    setProgress(loader, 'Finding available port…')
    backendPort = await findFreePort(8765)
    writePort(backendPort)
    log(`Chose port ${backendPort}`)

    // Problems 4 & 9: start backend with restart logic + progress updates
    await startBackend(backendPort, loader)

  } catch (err) {
    log(`Backend startup failed: ${err.message}`)
    loader.hide()

    const { response } = await dialog.showMessageBox({
      type: 'error',
      title: 'SecureHub — Backend Failed',
      message: 'The backend could not be started.',
      detail:
        `${err.message}\n\n` +
        `Log: ${LOG_FILE}\n\n` +
        'Troubleshooting:\n' +
        '  • Make sure no other app is using ports 8765–8800\n' +
        '  • Check that Visual C++ Redistributable is installed\n' +
        '  • Re-install SecureHub if the problem persists',
      buttons: ['Continue Anyway', 'Quit'],
    })

    if (response === 1) { cleanup(); app.quit(); return }
    if (appQuitting) return
  }

  const mainWin = createMainWindow()

  // Close loader as soon as the main window is ready
  mainWin.once('ready-to-show', () => {
    if (!loader.isDestroyed()) loader.close()
    loaderWinRef = null
  })

  // Problem 2: 15 s fallback in case ready-to-show never fires
  setTimeout(() => {
    if (!loader.isDestroyed()) loader.close()
    if (!mainWin.isDestroyed() && !mainWin.isVisible()) {
      log('Fallback: forcing window visible after 15 s')
      mainWin.show()
    }
  }, 15_000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

// Problem 8: cleanup on all quit paths
app.on('before-quit', cleanup)
