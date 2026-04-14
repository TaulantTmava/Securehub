import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Nmap from './pages/Nmap'
import Hashcat from './pages/Hashcat'
import TheHive from './pages/TheHive'
import Metasploit from './pages/Metasploit'
import Aircrack from './pages/Aircrack'
import Setup from './pages/Setup'
import './App.css'

function AppLayout() {
  if (!localStorage.getItem('setup_complete')) {
    return <Navigate to="/setup" replace />
  }
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/nmap" element={<Nmap />} />
          <Route path="/hashcat" element={<Hashcat />} />
          <Route path="/thehive" element={<TheHive />} />
          <Route path="/metasploit" element={<Metasploit />} />
          <Route path="/aircrack" element={<Aircrack />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
