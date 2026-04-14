import { useState } from 'react'
import axios from 'axios'
import { API_BASE } from '../config'
import './Nmap.css'

export default function Nmap() {
  const [target, setTarget] = useState('')
  const [args, setArgs] = useState('-sV')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const handleScan = async () => {
    if (!target.trim()) return
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const res = await axios.get(`${API_BASE}/nmap/scan`, {
        params: { target: target.trim(), args },
      })
      setResults(res.data.results)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Scan failed. Make sure the backend is running and nmap is installed.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleScan()
    }
  }

  const totalPorts = results
    ? results.reduce((acc, host) => acc + host.ports.length, 0)
    : 0

  const openPorts = results
    ? results.reduce(
        (acc, host) =>
          acc + host.ports.filter((p) => p.state === 'open').length,
        0
      )
    : 0

  return (
    <div className="nmap-page">
      <div className="page-header">
        <h1 className="page-title">Nmap Scanner</h1>
        <p className="page-subtitle">
          Network discovery, port scanning, and service detection
        </p>
      </div>

      <div className="scan-form card">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Target</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 192.168.1.1 or scanme.nmap.org"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>
          <div className="form-group form-group-args">
            <label className="form-label">Scan Arguments</label>
            <input
              className="input"
              type="text"
              placeholder="-sV"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>
          <div className="form-group form-group-btn">
            <label className="form-label">&nbsp;</label>
            <button
              className="btn btn-primary scan-btn"
              onClick={handleScan}
              disabled={loading || !target.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Scanning...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  Run Scan
                </>
              )}
            </button>
          </div>
        </div>

        <div className="quick-args">
          <span className="quick-label">Quick args:</span>
          {[
            { label: 'Version Detection', value: '-sV' },
            { label: 'Fast Scan', value: '-F' },
            { label: 'Ping Scan', value: '-sn' },
            { label: 'OS Detection', value: '-O' },
            { label: 'Full Aggressive', value: '-A' },
          ].map((q) => (
            <button
              key={q.value}
              className={`quick-btn ${args === q.value ? 'quick-btn-active' : ''}`}
              onClick={() => setArgs(q.value)}
              disabled={loading}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="error-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {results !== null && (
        <>
          {results.length === 0 ? (
            <div className="no-results card">
              <div className="no-results-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <div className="no-results-text">No hosts found</div>
              <div className="no-results-sub">Try a different target or scan arguments</div>
            </div>
          ) : (
            <>
              <div className="scan-summary">
                <div className="summary-item">
                  <span className="summary-value">{results.length}</span>
                  <span className="summary-label">Hosts</span>
                </div>
                <div className="summary-item">
                  <span className="summary-value">{totalPorts}</span>
                  <span className="summary-label">Total Ports</span>
                </div>
                <div className="summary-item">
                  <span className="summary-value" style={{ color: 'var(--success)' }}>{openPorts}</span>
                  <span className="summary-label">Open Ports</span>
                </div>
              </div>

              {results.map((host) => (
                <div key={host.host} className="host-card card">
                  <div className="host-header">
                    <div className="host-info">
                      <div className="host-address">{host.host}</div>
                      <span
                        className={`host-status ${
                          host.status === 'up' ? 'host-up' : 'host-down'
                        }`}
                      >
                        <span className="status-dot-sm" />
                        {host.status}
                      </span>
                    </div>
                    <div className="host-port-count">
                      {host.ports.length} port{host.ports.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {host.ports.length > 0 ? (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Port</th>
                            <th>Protocol</th>
                            <th>State</th>
                            <th>Service</th>
                            <th>Version</th>
                          </tr>
                        </thead>
                        <tbody>
                          {host.ports.map((port) => (
                            <tr key={`${port.protocol}-${port.port}`}>
                              <td>
                                <span className="port-number">{port.port}</span>
                              </td>
                              <td>{port.protocol.toUpperCase()}</td>
                              <td>
                                <span
                                  className={`port-state ${
                                    port.state === 'open'
                                      ? 'state-open'
                                      : port.state === 'closed'
                                      ? 'state-closed'
                                      : 'state-filtered'
                                  }`}
                                >
                                  {port.state}
                                </span>
                              </td>
                              <td>{port.service || '—'}</td>
                              <td className="version-cell">{port.version || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="no-ports">No ports found for this host</div>
                  )}
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}
