import React, { useState } from 'react'
import Dashboard from './screens/Dashboard.jsx'
import PaygoSolar from './screens/PaygoSolar.jsx'
import EKekeFleet from './screens/EKekeFleet.jsx'
import SisiPayPOS from './screens/SisiPayPOS.jsx'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'solar', label: 'PAYGO Solar', icon: '☀' },
  { id: 'fleet', label: 'E-Keke', icon: '⚡' },
  { id: 'pos', label: 'Sisi Pay', icon: '₦' },
]

export default function App() {
  const [screen, setScreen] = useState('dashboard')

  const screens = {
    dashboard: <Dashboard onNavigate={setScreen} />,
    solar: <PaygoSolar />,
    fleet: <EKekeFleet />,
    pos: <SisiPayPOS />,
  }

  return (
    <div style={styles.app}>
      <div style={styles.content}>
        {screens[screen]}
      </div>
      <nav style={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            style={{
              ...styles.navBtn,
              ...(screen === item.id ? styles.navBtnActive : {}),
            }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span style={styles.navLabel}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    background: '#0f172a',
    color: '#e2e8f0',
    maxWidth: '480px',
    margin: '0 auto',
    position: 'relative',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingBottom: '64px',
  },
  nav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    background: '#1e293b',
    borderTop: '1px solid #334155',
    zIndex: 100,
  },
  navBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    gap: '2px',
  },
  navBtnActive: {
    color: '#22c55e',
  },
  navIcon: {
    fontSize: '20px',
    lineHeight: 1,
  },
  navLabel: {
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.02em',
  },
}
