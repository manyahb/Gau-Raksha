import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/',        label: 'Dashboard', icon: '⬡', emoji: '📊' },
  { path: '/health',  label: 'Health',    icon: '⬡', emoji: '🩺' },
  { path: '/vet',     label: 'Vet & AI',  icon: '⬡', emoji: '🤖' },
  { path: '/milk',    label: 'Milk',      icon: '⬡', emoji: '🥛' },
  { path: '/finance', label: 'Finance',   icon: '⬡', emoji: '₹'  },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme]       = useState(() => localStorage.getItem('theme') || 'dark')
  const location                = useLocation()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => { setMenuOpen(false) }, [location])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const isLight     = theme === 'light'

  return (
    <>
      {/* ── TOP NAV ── */}
      <nav className="topnav">
        {/* Brand */}
        <NavLink to="/" className="topnav-brand" onClick={() => setMenuOpen(false)}>
          <div className="topnav-brand-icon">🐄</div>
          <span>GauRaksha</span>
        </NavLink>

        {/* Desktop links */}
        <div className="topnav-links">
          {NAV_ITEMS.map(({ path, label, emoji }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => `topnav-link${isActive ? ' active' : ''}`}
            >
              <span style={{ fontSize: 13 }}>{emoji}</span>
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right actions */}
        <div className="topnav-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="live-dot" />
            <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '0.05em' }}>
              LIVE
            </span>
          </div>
          <button className="btn-theme" onClick={toggleTheme} aria-label="Toggle theme">
            {isLight ? '🌙' : '☀️'}
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* ── MOBILE MENU ── */}
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        {NAV_ITEMS.map(({ path, label, emoji }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `mobile-menu-link${isActive ? ' active' : ''}`}
          >
            <span style={{ fontSize: 16, width: 22 }}>{emoji}</span>
            {label}
          </NavLink>
        ))}
        <div className="mobile-menu-divider" />
        <div className="mobile-theme-row">
          <span className="mobile-theme-label">{isLight ? '☀️ Light mode' : '🌙 Dark mode'}</span>
          <button className="btn-theme" onClick={toggleTheme}>{isLight ? '🌙' : '☀️'}</button>
        </div>
      </div>

      {/* ── SIDEBAR (desktop) ── */}
      <aside className="sidebar">
        <p className="sidebar-section-title">Navigation</p>
        {NAV_ITEMS.map(({ path, label, emoji }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-link-icon">{emoji}</span>
            {label}
          </NavLink>
        ))}

        <p className="sidebar-section-title" style={{ marginTop: '1.5rem' }}>System</p>
        <div style={{ padding: '9px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className="live-dot" />
            <span style={{ fontSize: 11.5, color: 'var(--green)', fontFamily: 'JetBrains Mono,monospace' }}>CONNECTED</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)' }}>2 farm nodes online</p>
        </div>

        {/* Sidebar footer — theme toggle */}
        <div className="sidebar-footer">
          <div className="sidebar-theme-toggle" onClick={toggleTheme}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{isLight ? '☀️' : '🌙'}</span>
              <span className="sidebar-theme-label">{isLight ? 'Light mode' : 'Dark mode'}</span>
            </div>
            <div className={`theme-toggle-pill${isLight ? ' light' : ''}`} />
          </div>
          <div style={{ marginTop: '0.75rem', padding: '0 12px' }}>
            <p style={{ fontSize: 10.5, color: 'var(--text3)', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '0.04em' }}>
              GauRaksha v2.0 · 2026
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}