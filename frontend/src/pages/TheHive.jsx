import { useState, useCallback } from 'react'
import { API_BASE } from '../config'
import axios from 'axios'
import './TheHive.css'

const API = `${API_BASE}/thehive`

const SEVERITY_MAP = {
  1: { label: 'Low', cls: 'sev-low' },
  2: { label: 'Medium', cls: 'sev-medium' },
  3: { label: 'High', cls: 'sev-high' },
}

function SeverityBadge({ value }) {
  const s = SEVERITY_MAP[value] || SEVERITY_MAP[2]
  return <span className={`sev-badge ${s.cls}`}>{s.label}</span>
}

function Toast({ msg, type, onClose }) {
  return (
    <div className={`toast toast-${type}`}>
      {type === 'success' ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      <span>{msg}</span>
      <button className="toast-close" onClick={onClose}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

// ── Connection Panel ──────────────────────────────────────────────────────────
function ConnectionPanel({ connected, version, onConnect }) {
  const [url, setUrl] = useState('http://localhost:9000')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleConnect = async () => {
    if (!url.trim() || !apiKey.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API}/connect`, { url: url.trim(), api_key: apiKey.trim() })
      if (res.data.status === 'connected') {
        onConnect({ url: url.trim(), version: res.data.version })
      } else {
        setError(res.data.detail || 'Connection failed')
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card connect-panel">
      <div className="connect-left">
        <div className="connect-fields">
          <input
            className="input connect-input"
            type="text"
            placeholder="TheHive URL (e.g. http://localhost:9000)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          <input
            className="input connect-input"
            type="password"
            placeholder="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          />
        </div>
        {error && <div className="connect-error">{error}</div>}
      </div>
      <div className="connect-right">
        <button
          className="btn btn-primary"
          onClick={handleConnect}
          disabled={loading || !url.trim() || !apiKey.trim()}
        >
          {loading ? <><span className="spinner" />Connecting...</> : 'Connect'}
        </button>
        <div className={`conn-status ${connected ? 'conn-ok' : 'conn-fail'}`}>
          <span className="conn-dot" />
          {connected ? `Connected${version ? ` · v${version}` : ''}` : 'Disconnected'}
        </div>
      </div>
    </div>
  )
}

// ── Cases Tab ─────────────────────────────────────────────────────────────────
function CasesTab({ connected, notify }) {
  const [cases, setCases] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${API}/cases`)
      setCases(res.data.cases)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch cases')
    } finally {
      setLoading(false)
    }
  }, [])

  const formatDate = (ts) => {
    if (!ts) return '—'
    const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts)
    return d.toLocaleString()
  }

  if (!connected) {
    return (
      <div className="tab-placeholder card">
        <div className="placeholder-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="placeholder-text">Connect to TheHive to view cases</div>
      </div>
    )
  }

  return (
    <div className="tab-section">
      <div className="tab-toolbar">
        <span className="tab-toolbar-title">
          {cases !== null ? `${cases.length} case${cases.length !== 1 ? 's' : ''}` : 'Cases'}
        </span>
        <button className="btn btn-primary" onClick={fetchCases} disabled={loading}>
          {loading ? <><span className="spinner" />Loading...</> : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {error && <div className="error-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>{error}</div>}

      {cases === null && !loading && !error && (
        <div className="card cases-empty">Click Refresh to load cases</div>
      )}

      {cases !== null && cases.length === 0 && (
        <div className="card cases-empty">No cases found in TheHive</div>
      )}

      {cases !== null && cases.length > 0 && (
        <div className="card table-card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td><span className="case-id">{c.caseId || c.id.slice(0, 8)}</span></td>
                    <td className="case-title-cell">{c.title}</td>
                    <td><SeverityBadge value={c.severity} /></td>
                    <td><span className="status-pill">{c.status}</span></td>
                    <td className="date-cell">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Create Case Tab ───────────────────────────────────────────────────────────
function CreateCaseTab({ connected, notify }) {
  const [form, setForm] = useState({ title: '', description: '', severity: 2, tags: '' })
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    setLoading(true)
    try {
      const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean)
      const res = await axios.post(`${API}/cases`, {
        title: form.title.trim(),
        description: form.description.trim(),
        severity: Number(form.severity),
        tags,
      })
      if (res.data.status === 'created') {
        notify('success', `Case #${res.data.caseId || res.data.id} created successfully`)
        setForm({ title: '', description: '', severity: 2, tags: '' })
      }
    } catch (err) {
      notify('error', err.response?.data?.detail || err.message || 'Failed to create case')
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <div className="tab-placeholder card">
        <div className="placeholder-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="placeholder-text">Connect to TheHive to create cases</div>
      </div>
    )
  }

  return (
    <div className="tab-section">
      <div className="card form-card">
        <div className="form-group">
          <label className="form-label">Title <span className="req">*</span></label>
          <input className="input" type="text" placeholder="Case title" value={form.title} onChange={set('title')} disabled={loading} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="input textarea" rows={4} placeholder="Describe the case..." value={form.description} onChange={set('description')} disabled={loading} />
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">Severity</label>
            <select className="input select" value={form.severity} onChange={set('severity')} disabled={loading}>
              <option value={1}>Low</option>
              <option value={2}>Medium</option>
              <option value={3}>High</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tags <span className="label-hint">(comma-separated)</span></label>
            <input className="input" type="text" placeholder="malware, phishing, apt" value={form.tags} onChange={set('tags')} disabled={loading} />
          </div>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !form.title.trim()}>
            {loading ? <><span className="spinner" />Creating...</> : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Case
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Create Alert Tab ──────────────────────────────────────────────────────────
function CreateAlertTab({ connected, notify }) {
  const [form, setForm] = useState({ title: '', description: '', severity: 2, source: '', sourceRef: '' })
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.source.trim() || !form.sourceRef.trim()) return
    setLoading(true)
    try {
      const res = await axios.post(`${API}/alerts`, {
        title: form.title.trim(),
        description: form.description.trim(),
        severity: Number(form.severity),
        source: form.source.trim(),
        sourceRef: form.sourceRef.trim(),
      })
      if (res.data.status === 'created') {
        notify('success', `Alert created (id: ${res.data.id.slice(0, 12)}...)`)
        setForm({ title: '', description: '', severity: 2, source: '', sourceRef: '' })
      }
    } catch (err) {
      notify('error', err.response?.data?.detail || err.message || 'Failed to create alert')
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <div className="tab-placeholder card">
        <div className="placeholder-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="placeholder-text">Connect to TheHive to create alerts</div>
      </div>
    )
  }

  return (
    <div className="tab-section">
      <div className="card form-card">
        <div className="form-group">
          <label className="form-label">Title <span className="req">*</span></label>
          <input className="input" type="text" placeholder="Alert title" value={form.title} onChange={set('title')} disabled={loading} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="input textarea" rows={3} placeholder="Describe the alert..." value={form.description} onChange={set('description')} disabled={loading} />
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">Severity</label>
            <select className="input select" value={form.severity} onChange={set('severity')} disabled={loading}>
              <option value={1}>Low</option>
              <option value={2}>Medium</option>
              <option value={3}>High</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Source <span className="req">*</span></label>
            <input className="input" type="text" placeholder="e.g. SIEM, IDS" value={form.source} onChange={set('source')} disabled={loading} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Source Reference <span className="req">*</span></label>
          <input className="input" type="text" placeholder="Unique reference ID from the source system" value={form.sourceRef} onChange={set('sourceRef')} disabled={loading} />
        </div>
        <div>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || !form.title.trim() || !form.source.trim() || !form.sourceRef.trim()}
          >
            {loading ? <><span className="spinner" />Creating...</> : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Create Alert
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'cases', label: 'Cases', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
  { id: 'create-case', label: 'Create Case', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> },
  { id: 'create-alert', label: 'Create Alert', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
]

export default function TheHive() {
  const [activeTab, setActiveTab] = useState('cases')
  const [connected, setConnected] = useState(false)
  const [version, setVersion] = useState(null)
  const [toast, setToast] = useState(null)

  const notify = useCallback((type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const handleConnect = ({ version: v }) => {
    setConnected(true)
    setVersion(v)
    notify('success', 'Connected to TheHive successfully')
  }

  return (
    <div className="thehive-page">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1 className="page-title">TheHive</h1>
        <p className="page-subtitle">Security incident response and case management</p>
      </div>

      <div className="info-banner">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        Connect to your TheHive instance to manage security incidents and cases
      </div>

      <ConnectionPanel connected={connected} version={version} onConnect={handleConnect} />

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

      {activeTab === 'cases' && <CasesTab connected={connected} notify={notify} />}
      {activeTab === 'create-case' && <CreateCaseTab connected={connected} notify={notify} />}
      {activeTab === 'create-alert' && <CreateAlertTab connected={connected} notify={notify} />}
    </div>
  )
}
