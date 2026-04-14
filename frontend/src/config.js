// Backend port is injected by the Electron preload script from the port file
// written by main.js. Falls back to 8765 for plain-browser dev contexts.
export const BACKEND_PORT = window.electronAPI?.backendPort ?? 8765
export const API_BASE = `http://localhost:${BACKEND_PORT}`
