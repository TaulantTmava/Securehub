import { useState } from 'react'
import axios from 'axios'
import './Hashcat.css'

const HASH_TYPES = [
  { label: 'MD5', value: 0 },
  { label: 'SHA-1', value: 100 },
  { label: 'SHA-256', value: 1400 },
  { label: 'SHA-512', value: 1700 },
  { label: 'bcrypt', value: 3200 },
  { label: 'NTLM', value: 1000 },
  { label: 'WPA/WPA2', value: 2500 },
]

function DownloadBanner() {
  return (
    <div className="warning-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>
        Hashcat requires GPU drivers and must be installed separately.{' '}
        <a
          className="banner-link"
          href="https://hashcat.net/hashcat/"
          target="_blank"
          rel="noreferrer"
        >
          Download from hashcat.net
        </a>
      </span>
    </div>
  )
}

function NotInstalledError() {
  return (
    <div className="not-installed-box">
      <div className="not-installed-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="not-installed-title">Hashcat not found</div>
      <div className="not-installed-body">
        Hashcat is not installed or not in your system PATH.
      </div>
      <a
        className="btn btn-primary"
        href="https://hashcat.net/hashcat/"
        target="_blank"
        rel="noreferrer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download Hashcat
      </a>
    </div>
  )
}

function CrackTab() {
  const [hash, setHash] = useState('')
  const [hashtype, setHashtype] = useState(0)
  const [wordlist, setWordlist] = useState('rockyou.txt')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [notInstalled, setNotInstalled] = useState(false)

  const handleCrack = async () => {
    if (!hash.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    setNotInstalled(false)

    try {
      const res = await axios.post('http://localhost:8765/hashcat/crack', {
        hash: hash.trim(),
        hashtype,
        wordlist,
      })
      setResult(res.data)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (detail === 'hashcat_not_found') {
        setNotInstalled(true)
      } else {
        setError(detail || err.message || 'Request failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tab-content">
      {notInstalled && <NotInstalledError />}

      <div className="card form-card">
        <div className="form-group">
          <label className="form-label">Hash</label>
          <textarea
            className="input textarea"
            rows={3}
            placeholder="Paste your hash here..."
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Hash Type</label>
            <select
              className="input select"
              value={hashtype}
              onChange={(e) => setHashtype(Number(e.target.value))}
              disabled={loading}
            >
              {HASH_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} ({t.value})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Wordlist Path</label>
            <input
              className="input"
              type="text"
              placeholder="rockyou.txt"
              value={wordlist}
              onChange={(e) => setWordlist(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <button
          className="btn btn-primary crack-btn"
          onClick={handleCrack}
          disabled={loading || !hash.trim()}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Cracking...
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              Run Crack
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {result && (
        <div className={`result-box card ${result.status === 'cracked' ? 'result-cracked' : 'result-failed'}`}>
          <div className="result-header">
            {result.status === 'cracked' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
            <span className="result-status-text">
              {result.status === 'cracked' ? 'Hash Cracked!' : 'Not Found in Wordlist'}
            </span>
            <span className="result-time">{result.time_elapsed}s</span>
          </div>
          {result.status === 'cracked' && result.result && (
            <div className="result-password">
              <span className="result-password-label">Password</span>
              <code className="result-password-value">{result.result}</code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IdentifyTab() {
  const [hash, setHash] = useState('')
  const [loading, setLoading] = useState(false)
  const [types, setTypes] = useState(null)
  const [error, setError] = useState(null)

  const handleIdentify = async () => {
    if (!hash.trim()) return
    setLoading(true)
    setTypes(null)
    setError(null)

    try {
      const res = await axios.get('http://localhost:8765/hashcat/identify', {
        params: { hash: hash.trim() },
      })
      setTypes(res.data.possible_types)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tab-content">
      <div className="card form-card">
        <div className="form-group">
          <label className="form-label">Hash</label>
          <textarea
            className="input textarea"
            rows={3}
            placeholder="Paste your hash to identify its type..."
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            disabled={loading}
          />
        </div>

        <button
          className="btn btn-primary crack-btn"
          onClick={handleIdentify}
          disabled={loading || !hash.trim()}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Identifying...
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Identify Hash
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {types !== null && (
        <div className="identify-results">
          {types.length === 0 ? (
            <div className="card no-types">
              <div className="no-types-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="no-types-text">No matching hash types found</div>
              <div className="no-types-sub">The hash format doesn't match any known patterns</div>
            </div>
          ) : (
            <>
              <div className="identify-count">{types.length} possible type{types.length !== 1 ? 's' : ''} identified</div>
              <div className="types-grid">
                {types.map((t) => (
                  <div key={t.hashcat_code} className="type-card card">
                    <div className="type-name">{t.name}</div>
                    <div className="type-code-row">
                      <span className="type-code-label">Hashcat mode</span>
                      <span className="type-code">{t.hashcat_code}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function Hashcat() {
  const [activeTab, setActiveTab] = useState('crack')

  return (
    <div className="hashcat-page">
      <div className="page-header">
        <h1 className="page-title">Hashcat</h1>
        <p className="page-subtitle">Password hash cracking and identification</p>
      </div>

      <DownloadBanner />

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'crack' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('crack')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          Crack Hash
        </button>
        <button
          className={`tab-btn ${activeTab === 'identify' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('identify')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Identify Hash
        </button>
      </div>

      {activeTab === 'crack' ? <CrackTab /> : <IdentifyTab />}
    </div>
  )
}
