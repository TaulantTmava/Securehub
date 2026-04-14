const { contextBridge, ipcRenderer } = require('electron')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Read the port file synchronously so config.js gets the value immediately
// (no async needed in React components). main.js writes this before creating the window.
const PORT_FILE = path.join(os.tmpdir(), 'securehub_port.txt')
let port = 8765
try {
  const p = parseInt(fs.readFileSync(PORT_FILE, 'utf8').trim(), 10)
  if (p >= 1024 && p <= 65535) port = p
} catch (_) {}

contextBridge.exposeInMainWorld('electronAPI', {
  backendPort: port,
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),
})
