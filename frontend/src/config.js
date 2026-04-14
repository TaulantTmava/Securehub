// The port is resolved via IPC from the Electron main process.
// API_BASE starts at the default and is updated as soon as the IPC
// round-trip completes (well before any user-initiated API call).
export let API_BASE = 'http://localhost:8765'

if (window.electronAPI?.getBackendPort) {
  window.electronAPI.getBackendPort().then(port => {
    if (port) API_BASE = `http://localhost:${port}`
  }).catch(() => {})
}
