import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, Users, Calendar, Activity, Settings, Zap } from 'lucide-react'
import DashboardPage from './pages/Dashboard'
import JobsPage from './pages/Jobs'
import WorkersPage from './pages/Workers'
import SchedulesPage from './pages/Schedules'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">TF</div>
        <span>TaskForge</span>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Overview</div>
        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={15} /> Dashboard
        </NavLink>
        <NavLink to="/jobs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Briefcase size={15} /> Jobs
        </NavLink>

        <div className="sidebar-section-label">Infrastructure</div>
        <NavLink to="/workers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={15} /> Workers
        </NavLink>
        <NavLink to="/schedules" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={15} /> Schedules
        </NavLink>

        <div className="sidebar-section-label" style={{ marginTop: 'auto' }}>System</div>
        <a className="nav-item" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
          <Activity size={15} /> API Docs
        </a>
      </nav>
    </aside>
  )
}

function Topbar() {
  const loc = useLocation()
  const crumbs: Record<string, string> = {
    '/': 'Dashboard',
    '/jobs': 'Jobs',
    '/workers': 'Workers',
    '/schedules': 'Schedules',
  }
  const label = crumbs[loc.pathname] ?? 'TaskForge'
  return (
    <div className="topbar">
      <div className="topbar-breadcrumb">
        <Zap size={13} style={{ color: 'var(--accent)' }} />
        TaskForge <span style={{ opacity: 0.4 }}>/</span>
        <span className="current">{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="live-dot" />
        <span className="text-muted text-sm">Live</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <Topbar />
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
