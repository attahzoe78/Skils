import React from 'react'

const CONFIG = {
  active: { bg: '#14532d', color: '#4ade80', label: 'Active' },
  overdue: { bg: '#7f1d1d', color: '#f87171', label: 'Overdue' },
  locked: { bg: '#1e1b4b', color: '#818cf8', label: 'Locked' },
  available: { bg: '#14532d', color: '#4ade80', label: 'Available' },
  on_hire: { bg: '#78350f', color: '#fbbf24', label: 'On Hire' },
}

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] || { bg: '#334155', color: '#94a3b8', label: status }
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  )
}
