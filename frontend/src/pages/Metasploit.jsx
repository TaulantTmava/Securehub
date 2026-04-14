import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import './Metasploit.css'

const API = 'http://localhost:8765/metasploit'

// ── Status Banner ─────────────────────────────────────────────────────────────
function StatusBanner({ status, loading }) {
  if (loading) {
    return (
      <div className="msf-status-banner msf-status-checking">
        <span className="spinner" />
        Checking WSL + Metasploit availability...
      </div>
    )
  }
  if (!status) return null
  if (status.available) {
    return (
      <div className="msf-status-banner msf-status-ok">
        <span className="msf-dot msf-dot-ok" />
        Metasploit Framework available via WSL
        {status.version && (
          <span className="msf-version">{status.version.split('\n')[0]}</span>
        )}
      </div>
    )
  }
  return (
    <div className="msf-status-banner msf-status-err">
      <span className="msf-dot msf-dot-err" />
      {status.wsl === false
        ? 'WSL not found — install WSL2 and Metasploit Framework'
        : 'Metasploit not found in WSL — run: sudo apt install metasploit-framework'}
      {status.error && <span className="msf-err-detail">{status.error}</span>}
    </div>
  )
}

// ── Search Tab ────────────────────────────────────────────────────────────────
function SearchTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [rawOutput, setRawOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showRaw, setShowRaw] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResults(null)
    setRawOutput('')
    try {
      const res = await axios.post(`${API}/search`, { query: query.trim() })
      if (res.data.error) {
        setError(res.data.error)
      } else {
        setResults(res.data.results || [])
        setRawOutput(res.data.raw_output || '')
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [query])

  return (
    <div className="tab-section">
      <div className="card">
        <div className="msf-search-row">
          <input
            className="input msf-search-input"
            type="text"
            placeholder="e.g. eternalblue, ssh_login, smb"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            disabled={loading}
          />
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <><span className="spinner" />Searching...</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Search
              </>
            )}
          </button>
        </div>
        <div className="msf-quick-searches">
          {['eternalblue', 'ssh_login', 'ftp', 'smb', 'http_version'].map((q) => (
            <button
              key={q}
              className="msf-quick-btn"
              onClick={() => { setQuery(q); }}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="error-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {results !== null && (
        <div className="card table-card">
          <div className="tab-toolbar" style={{ padding: '14px 16px 0' }}>
            <span className="tab-toolbar-title">
              {results.length} module{results.length !== 1 ? 's' : ''} found
            </span>
            {rawOutput && (
              <button className="msf-raw-toggle" onClick={() => setShowRaw((v) => !v)}>
                {showRaw ? 'Hide raw' : 'Show raw'}
              </button>
            )}
          </div>

          {showRaw && rawOutput && (
            <div className="msf-terminal" style={{ margin: '12px 16px' }}>
              <pre>{rawOutput}</pre>
            </div>
          )}

          {!showRaw && results.length === 0 && (
            <div style={{ padding: '24px 16px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
              No modules found for "{query}"
            </div>
          )}

          {!showRaw && results.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Module Name</th>
                    <th>Rank</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td><span className="msf-module-name">{r.name}</span></td>
                      <td><span className={`msf-rank msf-rank-${r.rank?.toLowerCase()}`}>{r.rank || '—'}</span></td>
                      <td className="msf-desc-cell">{r.description || r.raw}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Quick Scan Tab ────────────────────────────────────────────────────────────
function ScanTab() {
  const [target, setTarget] = useState('')
  const [module, setModule] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleScan = useCallback(async () => {
    if (!target.trim() || !module.trim()) return
    setLoading(true)
    setError(null)
    setOutput('')
    try {
      const res = await axios.post(`${API}/scan`, {
        target: target.trim(),
        module: module.trim(),
      })
      if (res.data.error) {
        setError(res.data.error)
      } else {
        setOutput(res.data.output || '')
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Scan failed')
    } finally {
      setLoading(false)
    }
  }, [target, module])

  const EXAMPLE_MODULES = [
    'auxiliary/scanner/portscan/tcp',
    'auxiliary/scanner/ssh/ssh_version',
    'auxiliary/scanner/ftp/ftp_version',
    'auxiliary/scanner/smb/smb_version',
  ]

  return (
    <div className="tab-section">
      <div className="card form-card">
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">Target <span className="req">*</span></label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 192.168.1.1 or 10.0.0.0/24"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Module <span className="req">*</span></label>
            <input
              className="input"
              type="text"
              placeholder="e.g. auxiliary/scanner/portscan/tcp"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Quick Module Select</label>
          <div className="msf-quick-searches">
            {EXAMPLE_MODULES.map((m) => (
              <button
                key={m}
                className="msf-quick-btn"
                onClick={() => setModule(m)}
                disabled={loading}
              >
                {m.split('/').pop()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <button
            className="btn btn-primary"
            onClick={handleScan}
            disabled={loading || !target.trim() || !module.trim()}
          >
            {loading ? (
              <><span className="spinner" />Running...</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Run Scan
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {output && (
        <div className="card msf-output-card">
          <div className="tab-toolbar" style={{ marginBottom: '10px' }}>
            <span className="tab-toolbar-title">Output</span>
            <button className="msf-raw-toggle" onClick={() => setOutput('')}>Clear</button>
          </div>
          <div className="msf-terminal">
            <pre>{output}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────
const TABS = [
  {
    id: 'search',
    label: 'Module Search',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    id: 'scan',
    label: 'Quick Scan',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
]

export default function Metasploit() {
  const [activeTab, setActiveTab] = useState('search')
  const [statusData, setStatusData] = useState(null)
  const [statusLoading, setStatusLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/status`)
      .then((res) => setStatusData(res.data))
      .catch(() => setStatusData({ available: false, wsl: false, error: 'Could not reach backend' }))
      .finally(() => setStatusLoading(false))
  }, [])

  return (
    <div className="msf-page">
      <div className="page-header">
        <h1 className="page-title">Metasploit</h1>
        <p className="page-subtitle">Penetration testing framework via WSL2</p>
      </div>

      <StatusBanner status={statusData} loading={statusLoading} />

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'search' && <SearchTab />}
      {activeTab === 'scan' && <ScanTab />}
    </div>
  )
}
