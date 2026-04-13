import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Setup.css'

const API = 'http://localhost:8000'

const TOOLS = [
  { key: 'nmap',        label: 'Nmap',         desc: 'Network scanner',                  auto: true  },
  { key: 'hashcat',     label: 'Hashcat',       desc: 'Password hash cracker',            auto: true  },
  { key: 'wsl',         label: 'WSL2',          desc: 'Windows Subsystem for Linux',      auto: false },
  { key: 'docker',      label: 'Docker',        desc: 'Container runtime (TheHive)',      auto: false },
  { key: 'metasploit',  label: 'Metasploit',    desc: 'Penetration testing framework',    auto: false },
  { key: 'aircrack',    label: 'Aircrack-ng',   desc: 'WiFi security analysis',           auto: false },
]

const MANUAL_INSTRUCTIONS = {
  wsl: {
    title: 'Enable WSL2',
    steps: [
      { label: 'Run in PowerShell (Admin)', cmd: 'wsl --install' },
      { label: 'Set WSL2 as default', cmd: 'wsl --set-default-version 2' },
      { label: 'Restart your computer, then reopen SecureHub', cmd: null },
    ],
  },
  docker: {
    title: 'Install Docker Desktop',
    steps: [
      { label: 'Download Docker Desktop installer', cmd: null, link: 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe' },
      { label: 'Run installer and follow setup wizard', cmd: null },
      { label: 'Start Docker Desktop and ensure it is running', cmd: null },
    ],
  },
  metasploit: {
    title: 'Install Metasploit (WSL2)',
    steps: [
      { label: 'Open WSL2 terminal and run', cmd: 'curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > msfinstall && chmod 755 msfinstall && sudo ./msfinstall' },
    ],
  },
  aircrack: {
    title: 'Install Aircrack-ng (WSL2)',
    steps: [
      { label: 'Open WSL2 terminal and run', cmd: 'sudo apt update && sudo apt install -y aircrack-ng' },
    ],
  },
}

function CheckIcon() {
  return (
    <svg className="icon-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg className="icon-cross" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function Spinner({ size = 16 }) {
  return <span className="setup-spinner" style={{ width: size, height: size }} />
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button className="copy-btn" onClick={copy}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function StepDots({ current, total }) {
  return (
    <div className="step-dots">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`step-dot ${i + 1 === current ? 'step-dot-active' : i + 1 < current ? 'step-dot-done' : ''}`} />
      ))}
    </div>
  )
}

export default function Setup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [status, setStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [statusError, setStatusError] = useState(false)
  const [installing, setInstalling] = useState({})
  const [installResult, setInstallResult] = useState({})
  const [manualChecked, setManualChecked] = useState({})

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true)
    setStatusError(false)
    try {
      const res = await axios.get(`${API}/setup/status`, { timeout: 8000 })
      setStatus(res.data)
    } catch {
      setStatusError(true)
      setStatus({ nmap: false, hashcat: false, wsl: false, docker: false, metasploit: false, aircrack: false })
    }
    setLoadingStatus(false)
  }, [])

  useEffect(() => {
    if (step === 2) fetchStatus()
  }, [step, fetchStatus])

  const autoTools = TOOLS.filter(t => t.auto)
  const manualTools = TOOLS.filter(t => !t.auto)

  const missingAuto  = status ? autoTools.filter(t => !status[t.key])   : []
  const missingManual = status ? manualTools.filter(t => !status[t.key]) : []

  const allAutoInstalled = missingAuto.every(t =>
    installResult[t.key] === 'done' || status?.[t.key]
  )

  const installTool = async (key) => {
    setInstalling(prev => ({ ...prev, [key]: true }))
    try {
      const res = await axios.post(`${API}/setup/install/${key}`, {}, { timeout: 120000 })
      setInstallResult(prev => ({ ...prev, [key]: res.data.status === 'failed' ? 'failed' : 'done' }))
    } catch {
      setInstallResult(prev => ({ ...prev, [key]: 'failed' }))
    }
    setInstalling(prev => ({ ...prev, [key]: false }))
  }

  const installAll = () => {
    missingAuto.forEach(t => {
      if (!installResult[t.key] && !installing[t.key]) installTool(t.key)
    })
  }

  const toggleManual = (key) => {
    setManualChecked(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const finish = () => {
    localStorage.setItem('setup_complete', 'true')
    navigate('/dashboard', { replace: true })
  }

  const skip = () => {
    localStorage.setItem('setup_complete', 'true')
    navigate('/dashboard', { replace: true })
  }

  // ── Step rendering ──────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="setup-step">
        <div className="setup-logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4351c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1 className="setup-title">Welcome to SecureHub</h1>
        <p className="setup-desc">
          A unified security toolkit for network analysis, password auditing,
          penetration testing, and more. This wizard will check your environment
          and help you get everything set up.
        </p>
        <div className="setup-feature-list">
          {TOOLS.map(t => (
            <div key={t.key} className="setup-feature-item">
              <div className="setup-feature-dot" />
              <span className="setup-feature-label">{t.label}</span>
              <span className="setup-feature-desc">— {t.desc}</span>
            </div>
          ))}
        </div>
        <div className="setup-actions">
          <button className="setup-btn-primary" onClick={() => setStep(2)}>
            Get Started
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <button className="setup-btn-ghost" onClick={skip}>Skip setup</button>
        </div>
      </div>
    )
  }

  function renderStep2() {
    return (
      <div className="setup-step">
        <h2 className="setup-title">Checking Dependencies</h2>
        <p className="setup-desc">
          SecureHub needs these tools installed to function. Checking your system now…
        </p>

        {statusError && (
          <div className="setup-warning">
            Backend API not reachable — dependency check may be inaccurate.
            Make sure to start the backend before running the app.
          </div>
        )}

        <div className="dep-list">
          {TOOLS.map(t => {
            const ok = status?.[t.key]
            return (
              <div key={t.key} className="dep-row">
                <div className="dep-info">
                  <span className="dep-name">{t.label}</span>
                  <span className="dep-desc">{t.desc}</span>
                </div>
                <div className="dep-status">
                  {loadingStatus ? (
                    <Spinner />
                  ) : ok ? (
                    <span className="dep-ok"><CheckIcon /> Installed</span>
                  ) : (
                    <span className="dep-missing">
                      <CrossIcon />
                      {t.auto ? 'Missing — auto-installable' : 'Missing — manual install'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="setup-actions">
          <button
            className="setup-btn-primary"
            onClick={() => setStep(3)}
            disabled={loadingStatus}
          >
            {loadingStatus ? <><Spinner /> Checking…</> : 'Continue'}
          </button>
          <button className="setup-btn-ghost" onClick={() => setStep(1)}>Back</button>
          {!loadingStatus && (
            <button className="setup-btn-ghost" onClick={fetchStatus}>Re-check</button>
          )}
        </div>
      </div>
    )
  }

  function renderStep3() {
    const anyMissing = missingAuto.length > 0
    return (
      <div className="setup-step">
        <h2 className="setup-title">Auto-Install Tools</h2>
        <p className="setup-desc">
          {anyMissing
            ? 'The following tools can be installed automatically. Click Install or Install All.'
            : 'All auto-installable tools are already present on your system.'}
        </p>

        <div className="install-list">
          {autoTools.map(t => {
            const ok = status?.[t.key]
            const result = installResult[t.key]
            const busy = installing[t.key]
            return (
              <div key={t.key} className="install-row">
                <div className="dep-info">
                  <span className="dep-name">{t.label}</span>
                  <span className="dep-desc">{t.desc}</span>
                </div>
                <div className="install-status">
                  {ok || result === 'done' ? (
                    <span className="dep-ok"><CheckIcon /> Installed</span>
                  ) : result === 'failed' ? (
                    <span className="dep-failed"><CrossIcon /> Failed</span>
                  ) : busy ? (
                    <span className="dep-installing"><Spinner /> Installing…</span>
                  ) : ok === false ? (
                    <button
                      className="setup-btn-small"
                      onClick={() => installTool(t.key)}
                    >
                      Install
                    </button>
                  ) : (
                    <span className="dep-ok"><CheckIcon /> Installed</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {anyMissing && (
          <div className="install-all-row">
            <button
              className="setup-btn-primary"
              onClick={installAll}
              disabled={Object.values(installing).some(Boolean)}
            >
              {Object.values(installing).some(Boolean) ? (
                <><Spinner /> Installing…</>
              ) : (
                'Install All Missing'
              )}
            </button>
          </div>
        )}

        <div className="setup-actions">
          <button
            className="setup-btn-primary"
            onClick={() => setStep(4)}
            disabled={Object.values(installing).some(Boolean)}
          >
            Continue
          </button>
          <button className="setup-btn-ghost" onClick={() => setStep(2)}>Back</button>
        </div>
      </div>
    )
  }

  function renderStep4() {
    const needed = missingManual
    const allChecked = needed.every(t => manualChecked[t.key])

    return (
      <div className="setup-step">
        <h2 className="setup-title">Manual Setup Steps</h2>
        <p className="setup-desc">
          {needed.length > 0
            ? 'The following tools require manual installation. Follow the instructions below, then check each item off.'
            : 'All tools that require manual setup are already installed. You\'re good to go!'}
        </p>

        {needed.length > 0 && (
          <div className="manual-list">
            {needed.map(t => {
              const instr = MANUAL_INSTRUCTIONS[t.key]
              return (
                <div key={t.key} className={`manual-card ${manualChecked[t.key] ? 'manual-card-done' : ''}`}>
                  <div className="manual-card-header">
                    <div className="manual-card-title">
                      <span className="dep-name">{instr.title}</span>
                    </div>
                    <label className="manual-checkbox-label">
                      <input
                        type="checkbox"
                        className="manual-checkbox"
                        checked={!!manualChecked[t.key]}
                        onChange={() => toggleManual(t.key)}
                      />
                      <span>Done</span>
                    </label>
                  </div>
                  <div className="manual-steps">
                    {instr.steps.map((s, i) => (
                      <div key={i} className="manual-step">
                        <span className="manual-step-num">{i + 1}</span>
                        <div className="manual-step-content">
                          <div className="manual-step-label">{s.label}</div>
                          {s.cmd && (
                            <div className="code-block">
                              <code>{s.cmd}</code>
                              <CopyButton text={s.cmd} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="setup-actions">
          <button
            className="setup-btn-primary"
            onClick={() => setStep(5)}
          >
            {needed.length > 0 && !allChecked ? 'Continue Anyway' : 'Continue'}
          </button>
          <button className="setup-btn-ghost" onClick={() => setStep(3)}>Back</button>
        </div>
      </div>
    )
  }

  function renderStep5() {
    return (
      <div className="setup-step setup-step-final">
        <div className="setup-success-icon">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="setup-title">SecureHub is Ready!</h2>
        <p className="setup-desc">
          Setup complete. Your environment has been configured and SecureHub is ready to use.
          You can always re-run the setup wizard from the settings menu.
        </p>
        <div className="setup-summary">
          {TOOLS.map(t => {
            const ok = status?.[t.key] || installResult[t.key] === 'done' || manualChecked[t.key]
            return (
              <div key={t.key} className="summary-row">
                {ok ? <CheckIcon /> : <CrossIcon />}
                <span className={ok ? 'summary-ok' : 'summary-skip'}>{t.label}</span>
              </div>
            )
          })}
        </div>
        <div className="setup-actions">
          <button className="setup-btn-primary setup-btn-launch" onClick={finish}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Launch SecureHub
          </button>
        </div>
      </div>
    )
  }

  const steps = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5]

  return (
    <div className="setup-root">
      <div className="setup-card">
        <div className="setup-card-inner">
          <StepDots current={step} total={5} />
          {steps[step - 1]()}
        </div>
      </div>
    </div>
  )
}
