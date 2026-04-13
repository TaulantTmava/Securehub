import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Nmap from './pages/Nmap'
import Hashcat from './pages/Hashcat'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/nmap" element={<Nmap />} />
            <Route path="/hashcat" element={<Hashcat />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
