// Sync — available immediately from preload.js port file read.
// Falls back to 8765 when running outside Electron (e.g. vite dev in browser).
export const BACKEND_PORT = window.electronAPI?.backendPort ?? 8765
export const API_BASE = `http://localhost:${BACKEND_PORT}`

// Async — IPC fallback if the sync value is ever stale.
export const getApiBase = async () => {
  if (window.electronAPI?.getBackendPort) {
    const port = await window.electronAPI.getBackendPort()
    return `http://localhost:${port}`
  }
  return API_BASE
}
