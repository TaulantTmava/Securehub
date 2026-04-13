import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import './Aircrack.css'

const API = 'http://localhost:8000/aircrack'

// ── Status Banner ─────────────────────────────────────────────────────────────
function StatusBanner({ status, loading }) {
  if (loading) {
    return (
      <div className="ac-status-banner ac-status-checking">
        <span className="spinner" />
        Checking WSL + Aircrack-ng availability...
      </div>
    )
  }
  if (!status) return null
  if (status.available) {
    return (
      <div className="ac-status-banner ac-status-ok">
        <span className="ac-dot ac-dot-ok" />
        Aircrack-ng available via WSL
        {status.version && (
          <span className="ac-version">{status.version.split('\n')[0]}</span>
        )}
      </div>
    )
  }
  return (
    <div className="ac-status-banner ac-status-err">
      <span className="ac-dot ac-dot-err" />
      {status.wsl === false
        ? 'WSL not found — install WSL2 and Aircrack-ng'
        : 'Aircrack-ng not found in WSL — run: sudo apt install aircrack-ng'}
      {status.error && <span className="ac-err-detail">{status.error}</span>}
    </div>
  )
}

// ── Analyze Tab ───────────────────────────────────────────────────────────────
function AnalyzeTab() {
  const [captureFile, setCaptureFile] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAnalyze = useCallback(async () => {
    if (!captureFile.trim()) return
    setLoading(true)
    setError(null)
    setOutput('')
    try {
      const res = await axios.post(`${API}/analyze`, { capture_file: captureFile.trim() })
      if (res.data.error) {
        setError(res.data.error)
      } else {
        setOutput(res.data.output || '')
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [captureFile])

  return (
    <div className="tab-section">
      <div className="card form-card">
        <div className="form-group">
          <label className="form-label">
            Capture File Path <span className="req">*</span>
            <span className="label-hint"> (.cap / .pcap — WSL path)</span>
          </label>
          <div className="ac-input-row">
            <input
              className="input"
              type="text"
              placeholder="/home/user/capture.cap or /mnt/c/Users/name/capture.cap"
              value={captureFile}
              onChange={(e) => setCaptureFile(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              disabled={loading}
            />
            <button
              className="btn btn-primary"
              onClick={handleAnalyze}
              disabled={loading || !captureFile.trim()}
            >
              {loading ? (
                <><span className="spinner" />Analyzing...</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                    <circle cx="12" cy="20" r="1" fill="currentColor" />
                  </svg>
                  Analyze
                </>
              )}
            </button>
          </div>
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
        <div className="card ac-output-card">
          <div className="tab-toolbar" style={{ marginBottom: '10px' }}>
            <span className="tab-toolbar-title">Results</span>
            <button className="ac-clear-btn" onClick={() => setOutput('')}>Clear</button>
          </div>
          <div className="ac-terminal">
            <pre>{output}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Info Tab ──────────────────────────────────────────────────────────────────
function InfoTab() {
  return (
    <div className="tab-section">
      <div className="card ac-info-card">
        <h3 className="ac-info-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          How to capture packets with Aircrack-ng
        </h3>
        <div className="ac-info-steps">
          <div className="ac-step">
            <div className="ac-step-num">1</div>
            <div>
              <div className="ac-step-title">Put your wireless adapter in monitor mode</div>
              <div className="ac-terminal ac-terminal-sm">
                <pre>{`# List wireless interfaces
wsl airmon-ng

# Enable monitor mode
wsl sudo airmon-ng start wlan0`}</pre>
              </div>
            </div>
          </div>
          <div className="ac-step">
            <div className="ac-step-num">2</div>
            <div>
              <div className="ac-step-title">Scan for nearby networks</div>
              <div className="ac-terminal ac-terminal-sm">
                <pre>{`wsl sudo airodump-ng wlan0mon`}</pre>
              </div>
            </div>
          </div>
          <div className="ac-step">
            <div className="ac-step-num">3</div>
            <div>
              <div className="ac-step-title">Capture handshake for a specific network</div>
              <div className="ac-terminal ac-terminal-sm">
                <pre>{`wsl sudo airodump-ng -c <channel> --bssid <AP_MAC> -w capture wlan0mon`}</pre>
              </div>
            </div>
          </div>
          <div className="ac-step">
            <div className="ac-step-num">4</div>
            <div>
              <div className="ac-step-title">Deauthenticate a client to force handshake (optional)</div>
              <div className="ac-terminal ac-terminal-sm">
                <pre>{`wsl sudo aireplay-ng --deauth 10 -a <AP_MAC> -c <CLIENT_MAC> wlan0mon`}</pre>
              </div>
            </div>
          </div>
          <div className="ac-step">
            <div className="ac-step-num">5</div>
            <div>
              <div className="ac-step-title">Analyze the capture file using this page</div>
              <div className="ac-step-desc">
                Enter the path to the <code>.cap</code> file (e.g. <code>/home/user/capture-01.cap</code>) in the Analyze tab above.
                Aircrack-ng will display network info and attempt to crack the key if a wordlist is provided.
              </div>
            </div>
          </div>
        </div>
        <div className="ac-warning">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Only use Aircrack-ng on networks you own or have explicit written permission to test.
        </div>
      </div>
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────
const TABS = [
  {
    id: 'analyze',
    label: 'Analyze',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <circle cx="12" cy="20" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'info',
    label: 'How to Capture',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
]

export default function Aircrack() {
  const [activeTab, setActiveTab] = useState('analyze')
  const [statusData, setStatusData] = useState(null)
  const [statusLoading, setStatusLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/status`)
      .then((res) => setStatusData(res.data))
      .catch(() => setStatusData({ available: false, wsl: false, error: 'Could not reach backend' }))
      .finally(() => setStatusLoading(false))
  }, [])

  return (
    <div className="ac-page">
      <div className="page-header">
        <h1 className="page-title">Aircrack-ng</h1>
        <p className="page-subtitle">Wireless network security auditing via WSL2</p>
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

      {activeTab === 'analyze' && <AnalyzeTab />}
      {activeTab === 'info' && <InfoTab />}
    </div>
  )
}
