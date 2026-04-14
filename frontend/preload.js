const { contextBridge } = require('electron')
const fs = require('fs')
const path = require('path')
const os = require('os')

const PORT_FILE = path.join(os.tmpdir(), 'securehub_port.txt')

let backendPort = 8765
try {
  const raw = fs.readFileSync(PORT_FILE, 'utf8').trim()
  const parsed = parseInt(raw, 10)
  if (parsed >= 1024 && parsed <= 65535) backendPort = parsed
} catch (_) {}

contextBridge.exposeInMainWorld('electronAPI', {
  backendPort,
})
