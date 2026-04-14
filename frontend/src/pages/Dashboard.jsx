import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

const modules = [
  {
    id: 'nmap',
    name: 'Nmap',
    description: 'Network discovery and security auditing. Scan hosts, open ports, services, and OS detection.',
    status: 'active',
    path: '/nmap',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
      </svg>
    ),
  },
  {
    id: 'hashcat',
    name: 'Hashcat',
    description: 'Advanced password recovery. Supports over 300 hash types with GPU acceleration.',
    status: 'active',
    path: '/hashcat',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
  },
  {
    id: 'aircrack',
    name: 'Aircrack-ng',
    description: 'Complete suite for WiFi network security assessment and WEP/WPA/WPA2 cracking.',
    status: 'wsl2',
    path: '/aircrack',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <circle cx="12" cy="20" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'metasploit',
    name: 'Metasploit',
    description: 'Penetration testing framework with hundreds of exploit modules and payloads.',
    status: 'wsl2',
    path: '/metasploit',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: 'thehive',
    name: 'TheHive',
    description: 'Scalable, open source security incident response platform for SOC teams.',
    status: 'active',
    path: '/thehive',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    id: 'burpsuite',
    name: 'BurpSuite',
    description: 'Leading web application security testing and vulnerability scanning platform.',
    status: 'coming-soon',
    path: null,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
]

function StatusBadge({ status }) {
  if (status === 'active') {
    return <span className="badge badge-active">Active</span>
  }
  if (status === 'wsl2') {
    return <span className="badge badge-active">Active via WSL2</span>
  }
  return <span className="badge badge-info">Coming Soon</span>
}

export default function Dashboard() {
  const navigate = useNavigate()
  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Security toolkit overview — select a module to get started</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">5</div>
          <div className="stat-label">Active Modules</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">2</div>
          <div className="stat-label">Via WSL2</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">1</div>
          <div className="stat-label">Coming Soon</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>Online</div>
          <div className="stat-label">API Status</div>
        </div>
      </div>

      <div className="section-title">Available Modules</div>
      <div className="modules-grid">
        {modules.map((mod) => (
          <div
            key={mod.id}
            className={`module-card ${mod.status === 'coming-soon' ? 'module-card-disabled' : 'module-card-active'}`}
            onClick={() => mod.path && navigate(mod.path)}
          >
            <div className="module-card-header">
              <div className={`module-icon ${mod.status === 'coming-soon' ? 'module-icon-dim' : ''}`}>
                {mod.icon}
              </div>
              <StatusBadge status={mod.status} />
            </div>
            <div className="module-name">{mod.name}</div>
            <div className="module-description">{mod.description}</div>
            {mod.status !== 'coming-soon' && (
              <div className="module-launch">
                Launch module →
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
