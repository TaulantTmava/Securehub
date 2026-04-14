const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')
const net = require('net')
const os = require('os')

// ── Error safety net ──────────────────────────────────────────────────────────
process.on('uncaughtException', err => {
  console.error('Uncaught exception:', err)
  try { dialog.showErrorBox('SecureHub — Unexpected Error', err.stack || err.message) } catch (_) {}
})
process.on('unhandledRejection', reason => console.error('Unhandled rejection:', reason))
process.on('SIGTERM', () => { cleanup(); app.quit() })
process.on('SIGINT',  () => { cleanup(); app.quit() })

// ── Paths ─────────────────────────────────────────────────────────────────────
const isProd    = app.isPackaged
const LOG_DIR   = isProd ? path.join(app.getPath('userData'), 'logs') : path.join(__dirname, '..', 'logs')
const LOG_FILE  = path.join(LOG_DIR, 'backend.log')
const LOCK_FILE = path.join(app.getPath('userData'), 'backend.lock')
const PORT_FILE = path.join(os.tmpdir(), 'securehub_port.txt')

try { if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true }) } catch (_) {}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try { fs.appendFileSync(LOG_FILE, line) } catch (_) {}
  console.log(msg)
}

// ── Path helpers — the three files that matter in production ──────────────────
function getBackendPath() {
  return isProd
    ? path.join(process.resourcesPath, 'securehub-backend.exe')
    : path.join(__dirname, '..', 'backend', 'dist', 'securehub-backend.exe')
}

function getPreloadPath() {
  // app.getAppPath() returns the root of app.asar (or the unpacked folder).
  // preload.js sits right next to main.js inside the asar.
  return path.join(app.getAppPath(), 'preload.js')
}

function getIndexPath() {
  // Vite outputs to dist/ which is bundled inside the asar alongside main.js.
  return path.join(app.getAppPath(), 'dist', 'index.html')
}

// ── Port helpers ──────────────────────────────────────────────────────────────
function findFreePort(start = 8765, max = 8800) {
  return new Promise((resolve, reject) => {
    if (start > max) return reject(new Error('No free port in 8765–8800'))
    const srv = net.createServer()
    srv.listen(start, '127.0.0.1', () => {
      const p = srv.address().port
      srv.close(() => resolve(p))
    })
    srv.on('error', () => findFreePort(start + 1, max).then(resolve, reject))
  })
}

function writePort(port) { try { fs.writeFileSync(PORT_FILE, String(port)) } catch (_) {} }
function deletePort()     { try { fs.unlinkSync(PORT_FILE) }                catch (_) {} }

// ── Lock file — single backend instance ──────────────────────────────────────
function killExistingBackend() {
  try {
    if (!fs.existsSync(LOCK_FILE)) return
    const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10)
    if (!pid) return
    try {
      process.kill(pid, 0)
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

// ── Loading screen ────────────────────────────────────────────────────────────
function setProgress(win, msg) {
  if (!win || win.isDestroyed()) return
  win.webContents.executeJavaScript(
    `(function(){var e=document.getElementById('pmsg');if(e)e.textContent=${JSON.stringify(msg)}})()`
  ).catch(() => {})
}

function createLoadingWindow() {
  const win = new BrowserWindow({
    width: 400, height: 260,
    backgroundColor: '#0a0a0f',
    frame: false, resizable: false, center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0a0f;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:18px}
    .logo{font-size:28px;font-weight:700;color:#d4351c;letter-spacing:1px}
    .spinner{width:32px;height:32px;border:3px solid #1e293b;border-top-color:#d4351c;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    #pmsg{font-size:13px;color:#94a3b8}
  </style></head><body>
    <div class="logo">SecureHub</div><div class="spinner"></div>
    <div id="pmsg">Starting SecureHub\u2026</div>
  </body></html>`))
  return win
}

// ── Backend process ───────────────────────────────────────────────────────────
let backendProc  = null
let backendPort  = 8765
let restartCount = 0
const MAX_RESTARTS = 3
let appQuitting  = false

function startBackend(port, loaderWin) {
  return new Promise((resolve, reject) => {
    let settled = false
    let pollInterval = null
    const done = err => { if (settled) return; settled = true; clearInterval(pollInterval); err ? reject(err) : resolve() }

    const backendPath = getBackendPath()
    log(`Backend exe: ${backendPath}`)
    log(`Backend exe exists: ${fs.existsSync(backendPath)}`)

    if (!fs.existsSync(backendPath)) return done(new Error(`Backend not found: ${backendPath}`))

    const env = { ...process.env, PORT: String(port) }
    // Add nmap to PATH if present
    const nmapDir = 'C:\\Program Files (x86)\\Nmap'
    if (env.PATH && !env.PATH.includes(nmapDir)) env.PATH = nmapDir + ';' + env.PATH

    let cmd, args, opts
    if (!isProd) {
      cmd  = path.join(__dirname, '..', 'backend', 'venv', 'Scripts', 'python.exe')
      args = ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(port)]
      opts = { cwd: path.join(__dirname, '..', 'backend'), env, stdio: ['ignore', 'pipe', 'pipe'] }
    } else {
      cmd  = backendPath
      args = []
      opts = { cwd: process.resourcesPath, env, stdio: ['ignore', 'pipe', 'pipe'] }
    }

    log(`Starting backend: ${cmd} on port ${port}`)
    setProgress(loaderWin, 'Starting backend\u2026')

    try { backendProc = spawn(cmd, args, opts) } catch (e) { return done(e) }

    writeLock(backendProc.pid)
    log(`Backend PID: ${backendProc.pid}`)

    backendProc.stdout.on('data', d => log(`[backend:out] ${d.toString().trim()}`))
    backendProc.stderr.on('data', d => log(`[backend:err] ${d.toString().trim()}`))
    backendProc.on('error', err => { log(`Spawn error: ${err.message}`); done(err) })
    backendProc.on('exit', (code, signal) => {
      log(`Backend exited (code=${code} signal=${signal})`)
      deleteLock()
      if (!settled) done(new Error(`Backend exited unexpectedly (code=${code})`))
      else if (!appQuitting && restartCount < MAX_RESTARTS) {
        restartCount++
        log(`Auto-restart ${restartCount}/${MAX_RESTARTS}`)
        setTimeout(() => startBackend(port, null).catch(e => log(`Restart failed: ${e.message}`)), 1500)
      }
    })

    // Health-check — 45 s deadline
    const deadline = Date.now() + 45_000
    let polls = 0
    pollInterval = setInterval(() => {
      polls++
      if (polls % 6 === 0) setProgress(loaderWin, `Connecting to backend\u2026 (${Math.round(polls / 2)}s)`)
      const req = http.get(`http://127.0.0.1:${port}/`, res => {
        res.resume()
        log(`Health ← HTTP ${res.statusCode}`)
        if (res.statusCode < 500) { setProgress(loaderWin, 'Ready!'); done(null) }
      })
      req.on('error', () => { if (Date.now() > deadline) done(new Error('Backend did not start within 45 s')) })
      req.setTimeout(1000, () => req.destroy())
    }, 500)
  })
}

function killBackend() {
  if (!backendProc || backendProc.killed) return
  log('Killing backend\u2026')
  try { backendProc.kill() } catch (_) {}
  setTimeout(() => { try { if (backendProc && !backendProc.killed) backendProc.kill('SIGKILL') } catch (_) {} }, 5000)
}

function cleanup() {
  if (appQuitting) return
  appQuitting = true
  log('Cleanup')
  killBackend(); deleteLock(); deletePort()
}

// ── Main window ───────────────────────────────────────────────────────────────
let mainWindow = null

function createMainWindow() {
  const preloadPath = getPreloadPath()
  const indexPath   = getIndexPath()

  log(`Preload : ${preloadPath}  (exists=${fs.existsSync(preloadPath)})`)
  log(`Index   : ${indexPath}  (exists=${fs.existsSync(indexPath)})`)

  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: preloadPath,
    },
  })

  mainWindow.setMenuBarVisibility(false)

  // Show window once the page has fully loaded (not just ready-to-show)
  mainWindow.webContents.on('did-finish-load', () => {
    log('did-finish-load — showing window')
    mainWindow.show()
  })

  // Retry on load failure
  let loadRetries = 0
  mainWindow.webContents.on('did-fail-load', (ev, code, desc, url) => {
    log(`did-fail-load (${code} ${desc}) url=${url}`)
    if (loadRetries < 3 && !mainWindow.isDestroyed()) {
      loadRetries++
      log(`Retrying load in 2 s (attempt ${loadRetries}/3)`)
      setTimeout(() => loadApp(), 2000)
    }
  })

  mainWindow.webContents.on('dom-ready', () => log('dom-ready'))

  function loadApp() {
    if (isProd) {
      log(`loadFile → ${indexPath}`)
      mainWindow.loadFile(indexPath)
    } else {
      const devURL = 'http://localhost:5173'
      log(`loadURL → ${devURL}`)
      mainWindow.loadURL(devURL)
    }
  }

  loadApp()
}

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.handle('get-backend-port', () => backendPort)

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Dependency check
  if (process.platform === 'win32') {
    const vcrt = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'vcruntime140.dll')
    if (!fs.existsSync(vcrt)) {
      dialog.showMessageBoxSync({ type: 'warning', title: 'SecureHub', message: 'Visual C++ Redistributable may be missing.',
        detail: 'Download from https://aka.ms/vs/17/release/vc_redist.x64.exe', buttons: ['OK'] })
    }
  }

  const loader = createLoadingWindow()

  try {
    killExistingBackend()
    setProgress(loader, 'Finding available port\u2026')
    backendPort = await findFreePort(8765)
    writePort(backendPort)
    log(`Port: ${backendPort}`)
    await startBackend(backendPort, loader)
  } catch (err) {
    log(`Backend failed: ${err.message}`)
    if (!loader.isDestroyed()) loader.hide()
    const { response } = await dialog.showMessageBox({
      type: 'error', title: 'SecureHub — Backend Failed',
      message: 'The backend could not be started.',
      detail: `${err.message}\n\nLog: ${LOG_FILE}`,
      buttons: ['Continue Anyway', 'Quit'],
    })
    if (response === 1) { cleanup(); app.quit(); return }
  }

  // Close loader → open main window
  if (!loader.isDestroyed()) loader.close()
  createMainWindow()

  // Fallback: force show after 15 s
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      log('Fallback: forcing window visible after 15 s')
      mainWindow.show()
    }
  }, 15_000)
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', cleanup)
