import React, { useEffect, useState, useCallback } from 'react'
import RevenueChart from '../components/RevenueChart.jsx'
import BatteryBar from '../components/BatteryBar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

const fmt = (n) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`

function Clock() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const josTime = now.toLocaleTimeString('en-NG', {
        timeZone: 'Africa/Lagos',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
      const josDate = now.toLocaleDateString('en-NG', {
        timeZone: 'Africa/Lagos',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      setTime(josTime)
      setDate(josDate)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={s.clockBox}>
      <div style={s.clockTime}>{time}</div>
      <div style={s.clockDate}>{date}</div>
      <div style={s.clockCity}>Jos, Plateau State · Nigeria</div>
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (e) {
      setError('Could not load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  const totals = data?.weekly_totals || {}
  const chartData = data?.chart_data || []
  const fleet = data?.fleet || []
  const overdueCount = data?.overdue_count || 0

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.logo}>
            <span style={s.logoIcon}>⚡</span>
            <span style={s.logoText}>JosEnergy Hub</span>
          </div>
          <div style={s.tagline}>Energy & Transport Management</div>
        </div>
        <button onClick={load} style={s.refreshBtn} title="Refresh">↻</button>
      </div>

      {/* Clock */}
      <div style={s.section}>
        <Clock />
      </div>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <div style={s.alert} onClick={() => onNavigate('solar')}>
          <div style={s.alertLeft}>
            <span style={s.alertIcon}>⚠</span>
            <div>
              <div style={s.alertTitle}>{overdueCount} Overdue Customer{overdueCount > 1 ? 's' : ''}</div>
              <div style={s.alertSub}>Tap to manage PAYGO Solar payments</div>
            </div>
          </div>
          <span style={s.alertArrow}>›</span>
        </div>
      )}

      {/* Weekly Totals */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Weekly Revenue</div>
        {loading ? (
          <div style={s.loader}>Loading...</div>
        ) : error ? (
          <div style={s.errorMsg}>{error}</div>
        ) : (
          <>
            <div style={s.totalCards}>
              <div style={{ ...s.totalCard, borderColor: '#f59e0b' }}>
                <div style={{ ...s.totalIcon, color: '#f59e0b' }}>☀</div>
                <div style={s.totalLabel}>Solar</div>
                <div style={{ ...s.totalValue, color: '#f59e0b' }}>{fmt(totals.solar || 0)}</div>
              </div>
              <div style={{ ...s.totalCard, borderColor: '#22c55e' }}>
                <div style={{ ...s.totalIcon, color: '#22c55e' }}>⚡</div>
                <div style={s.totalLabel}>E-Keke</div>
                <div style={{ ...s.totalValue, color: '#22c55e' }}>{fmt(totals.ekeke || 0)}</div>
              </div>
              <div style={{ ...s.totalCard, borderColor: '#38bdf8' }}>
                <div style={{ ...s.totalIcon, color: '#38bdf8' }}>₦</div>
                <div style={s.totalLabel}>POS</div>
                <div style={{ ...s.totalValue, color: '#38bdf8' }}>{fmt(totals.pos || 0)}</div>
              </div>
            </div>
            <div style={s.grandTotal}>
              Total: <strong style={{ color: '#22c55e' }}>{fmt(totals.total || 0)}</strong>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      <div style={s.section}>
        <div style={s.sectionTitle}>7-Day Revenue Breakdown</div>
        <div style={s.chartWrap}>
          <RevenueChart data={chartData} />
        </div>
      </div>

      {/* Fleet Battery */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Live Fleet Batteries</div>
        {fleet.length === 0 ? (
          <div style={s.emptyMsg}>No fleet data</div>
        ) : (
          fleet.map((keke) => (
            <div key={keke.keke_id} style={s.fleetRow}>
              <div style={s.fleetLeft}>
                <div style={s.fleetId}>{keke.keke_id}</div>
                <StatusBadge status={keke.status} />
              </div>
              <div style={s.fleetRight}>
                <BatteryBar level={keke.battery_level} height={10} />
                {keke.operator_name && (
                  <div style={s.operatorName}>{keke.operator_name}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Quick Actions</div>
        <div style={s.quickGrid}>
          <button style={{ ...s.quickBtn, borderColor: '#f59e0b' }} onClick={() => onNavigate('solar')}>
            <span style={{ fontSize: '24px' }}>☀</span>
            <span>PAYGO Solar</span>
          </button>
          <button style={{ ...s.quickBtn, borderColor: '#22c55e' }} onClick={() => onNavigate('fleet')}>
            <span style={{ fontSize: '24px' }}>⚡</span>
            <span>E-Keke Fleet</span>
          </button>
          <button style={{ ...s.quickBtn, borderColor: '#38bdf8' }} onClick={() => onNavigate('pos')}>
            <span style={{ fontSize: '24px' }}>₦</span>
            <span>Sisi Pay POS</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: {
    padding: '0 0 16px',
    minHeight: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: { fontSize: '22px' },
  logoText: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: '-0.02em',
  },
  tagline: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '2px',
  },
  refreshBtn: {
    background: '#334155',
    border: 'none',
    color: '#94a3b8',
    borderRadius: '8px',
    width: '36px',
    height: '36px',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockBox: {
    textAlign: 'center',
    padding: '12px',
    background: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #1e293b',
  },
  clockTime: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#22c55e',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
  },
  clockDate: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  clockCity: {
    fontSize: '11px',
    color: '#475569',
    marginTop: '2px',
  },
  section: {
    padding: '16px',
    borderBottom: '1px solid #1e293b',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '12px',
  },
  alert: {
    margin: '0 16px 0',
    background: '#450a0a',
    border: '1px solid #7f1d1d',
    borderRadius: '12px',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    marginTop: '12px',
  },
  alertLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  alertIcon: { fontSize: '22px', color: '#f87171' },
  alertTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#fca5a5',
  },
  alertSub: {
    fontSize: '11px',
    color: '#f87171',
    marginTop: '2px',
  },
  alertArrow: {
    fontSize: '22px',
    color: '#f87171',
  },
  totalCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '10px',
  },
  totalCard: {
    background: '#1e293b',
    borderRadius: '10px',
    padding: '12px 8px',
    textAlign: 'center',
    border: '1px solid',
    borderColor: '#334155',
  },
  totalIcon: { fontSize: '18px', marginBottom: '4px' },
  totalLabel: { fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: '600' },
  totalValue: { fontSize: '13px', fontWeight: '800' },
  grandTotal: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  chartWrap: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '12px 4px 4px',
  },
  fleetRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid #1e293b',
  },
  fleetLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '80px',
  },
  fleetId: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#e2e8f0',
  },
  fleetRight: {
    flex: 1,
  },
  operatorName: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '4px',
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  quickBtn: {
    background: '#1e293b',
    border: '1px solid',
    borderRadius: '12px',
    padding: '16px 8px',
    color: '#e2e8f0',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: '600',
    textAlign: 'center',
  },
  loader: {
    textAlign: 'center',
    color: '#64748b',
    padding: '24px',
    fontSize: '14px',
  },
  errorMsg: {
    textAlign: 'center',
    color: '#f87171',
    padding: '12px',
    fontSize: '13px',
  },
  emptyMsg: {
    textAlign: 'center',
    color: '#64748b',
    padding: '16px',
    fontSize: '13px',
  },
}
