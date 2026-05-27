import React, { useEffect, useState, useCallback } from 'react'
import BatteryBar from '../components/BatteryBar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

const fmt = (n) => `₦${Number(n).toLocaleString('en-NG')}`
const fmtTime = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-NG', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export default function EKekeFleet() {
  const [fleet, setFleet] = useState([])
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [recentHires, setRecentHires] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignForms, setAssignForms] = useState({})
  const [batteryForms, setBatteryForms] = useState({})
  const [actionLoading, setActionLoading] = useState({})
  const [toast, setToast] = useState(null)
  const [expandedHires, setExpandedHires] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadFleet = useCallback(async () => {
    try {
      const res = await fetch('/api/fleet')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setFleet(json.fleet)
      setTodayRevenue(json.today_revenue)
      setRecentHires(json.recent_hires)
    } catch {
      showToast('Failed to load fleet data', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFleet()
    const id = setInterval(loadFleet, 20000)
    return () => clearInterval(id)
  }, [loadFleet])

  const setAssignField = (kekeId, field, value) => {
    setAssignForms((f) => ({
      ...f,
      [kekeId]: { ...(f[kekeId] || { name: '', phone: '' }), [field]: value },
    }))
  }

  const handleAssign = async (kekeId) => {
    const form = assignForms[kekeId] || {}
    if (!form.name?.trim() || !form.phone?.trim()) {
      showToast('Operator name and phone are required', 'error')
      return
    }
    setActionLoading((a) => ({ ...a, [`assign_${kekeId}`]: true }))
    try {
      const res = await fetch('/api/fleet/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keke_id: kekeId,
          operator_name: form.name,
          operator_phone: form.phone,
        }),
      })
      if (!res.ok) throw new Error()
      showToast(`Operator checked in to ${kekeId}`)
      setAssignForms((f) => ({ ...f, [kekeId]: { name: '', phone: '' } }))
      await loadFleet()
    } catch {
      showToast('Assignment failed', 'error')
    } finally {
      setActionLoading((a) => ({ ...a, [`assign_${kekeId}`]: false }))
    }
  }

  const handleCheckout = async (kekeId) => {
    setActionLoading((a) => ({ ...a, [`checkout_${kekeId}`]: true }))
    try {
      const res = await fetch('/api/fleet/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keke_id: kekeId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Error')
      }
      const data = await res.json()
      showToast(`${kekeId} checked out. Revenue: ${fmt(data.revenue)} recorded!`)
      await loadFleet()
    } catch (e) {
      showToast(e.message || 'Checkout failed', 'error')
    } finally {
      setActionLoading((a) => ({ ...a, [`checkout_${kekeId}`]: false }))
    }
  }

  const handleBatteryUpdate = async (kekeId) => {
    const level = parseInt(batteryForms[kekeId] || '', 10)
    if (isNaN(level) || level < 0 || level > 100) {
      showToast('Enter a battery level between 0 and 100', 'error')
      return
    }
    setActionLoading((a) => ({ ...a, [`battery_${kekeId}`]: true }))
    try {
      const res = await fetch('/api/fleet/battery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keke_id: kekeId, battery_level: level }),
      })
      if (!res.ok) throw new Error()
      showToast(`Battery updated for ${kekeId}`)
      setBatteryForms((f) => ({ ...f, [kekeId]: '' }))
      await loadFleet()
    } catch {
      showToast('Battery update failed', 'error')
    } finally {
      setActionLoading((a) => ({ ...a, [`battery_${kekeId}`]: false }))
    }
  }

  if (loading) {
    return <div style={s.loader}>Loading fleet data...</div>
  }

  return (
    <div style={s.page}>
      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, background: toast.type === 'error' ? '#7f1d1d' : '#14532d', borderColor: toast.type === 'error' ? '#ef4444' : '#22c55e' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>⚡ E-Keke Fleet</div>
          <div style={s.subtitle}>Fleet operations & hire management</div>
        </div>
        <div style={s.revenueBox}>
          <div style={s.revenueVal}>{fmt(todayRevenue)}</div>
          <div style={s.revenueLbl}>Today's Revenue</div>
        </div>
      </div>

      {/* Fleet Cards */}
      {fleet.map((keke) => {
        const assignForm = assignForms[keke.keke_id] || { name: '', phone: '' }
        const isAssigning = !!actionLoading[`assign_${keke.keke_id}`]
        const isCheckingOut = !!actionLoading[`checkout_${keke.keke_id}`]
        const isUpdatingBattery = !!actionLoading[`battery_${keke.keke_id}`]
        const batteryVal = batteryForms[keke.keke_id] ?? ''

        return (
          <div key={keke.keke_id} style={s.card}>
            <div style={s.cardHeader}>
              <div>
                <div style={s.kekeId}>{keke.keke_id}</div>
                {keke.checked_in_at && (
                  <div style={s.checkinTime}>In since {fmtTime(keke.checked_in_at)}</div>
                )}
              </div>
              <StatusBadge status={keke.status} />
            </div>

            {/* Battery */}
            <div style={s.batterySection}>
              <div style={s.batteryLabel}>Battery Level</div>
              <BatteryBar level={keke.battery_level} height={14} />
            </div>

            {/* Battery Update */}
            <div style={s.batteryRow}>
              <input
                style={s.batteryInput}
                type="number"
                min="0"
                max="100"
                placeholder="Update %"
                value={batteryVal}
                onChange={(e) => setBatteryForms((f) => ({ ...f, [keke.keke_id]: e.target.value }))}
              />
              <button
                style={s.batteryBtn}
                onClick={() => handleBatteryUpdate(keke.keke_id)}
                disabled={isUpdatingBattery || batteryVal === ''}
              >
                {isUpdatingBattery ? '...' : 'Set'}
              </button>
            </div>

            {/* Operator Info */}
            {keke.operator_name ? (
              <div style={s.operatorBox}>
                <div style={s.operatorLabel}>Assigned Operator</div>
                <div style={s.operatorName}>{keke.operator_name}</div>
                <div style={s.operatorPhone}>{keke.operator_phone}</div>
                <button
                  style={s.checkoutBtn}
                  onClick={() => handleCheckout(keke.keke_id)}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? 'Processing...' : `✓ Check Out + Collect ₦3,500`}
                </button>
              </div>
            ) : (
              <div style={s.assignBox}>
                <div style={s.assignLabel}>Assign Operator</div>
                <input
                  style={s.input}
                  placeholder="Operator name"
                  value={assignForm.name}
                  onChange={(e) => setAssignField(keke.keke_id, 'name', e.target.value)}
                />
                <input
                  style={{ ...s.input, marginTop: '8px' }}
                  placeholder="Phone number"
                  type="tel"
                  value={assignForm.phone}
                  onChange={(e) => setAssignField(keke.keke_id, 'phone', e.target.value)}
                />
                <button
                  style={s.assignBtn}
                  onClick={() => handleAssign(keke.keke_id)}
                  disabled={isAssigning}
                >
                  {isAssigning ? 'Assigning...' : '✓ Confirm Check-In'}
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Recent Hires */}
      {recentHires.length > 0 && (
        <div style={s.section}>
          <div
            style={s.sectionHeader}
            onClick={() => setExpandedHires((v) => !v)}
          >
            <span style={s.sectionTitle}>Recent Hires ({recentHires.length})</span>
            <span style={s.sectionToggle}>{expandedHires ? '▲' : '▼'}</span>
          </div>
          {expandedHires && recentHires.map((hire) => (
            <div key={hire.id} style={s.hireRow}>
              <div>
                <div style={s.hireKeke}>{hire.keke_id}</div>
                <div style={s.hireOp}>{hire.operator_name} · {hire.operator_phone}</div>
              </div>
              <div style={s.hireRight}>
                <div style={s.hireRevenue}>{fmt(hire.revenue)}</div>
                <div style={s.hireDate}>{hire.hire_date}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  page: { padding: '0 0 16px', minHeight: '100%' },
  loader: { textAlign: 'center', color: '#64748b', padding: '48px 16px', fontSize: '14px' },
  toast: {
    position: 'fixed',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 999,
    padding: '10px 20px',
    borderRadius: '24px',
    border: '1px solid',
    fontSize: '13px',
    fontWeight: '600',
    color: '#e2e8f0',
    maxWidth: '340px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  title: { fontSize: '18px', fontWeight: '800', color: '#4ade80' },
  subtitle: { fontSize: '11px', color: '#64748b', marginTop: '2px' },
  revenueBox: { textAlign: 'right' },
  revenueVal: { fontSize: '18px', fontWeight: '800', color: '#22c55e' },
  revenueLbl: { fontSize: '10px', color: '#64748b', marginTop: '2px' },
  card: {
    margin: '12px 16px 0',
    background: '#1e293b',
    borderRadius: '14px',
    padding: '16px',
    border: '1px solid #334155',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  kekeId: { fontSize: '18px', fontWeight: '800', color: '#e2e8f0' },
  checkinTime: { fontSize: '11px', color: '#64748b', marginTop: '2px' },
  batterySection: { marginBottom: '8px' },
  batteryLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
  },
  batteryRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    alignItems: 'center',
  },
  batteryInput: {
    flex: 1,
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '8px 10px',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  batteryBtn: {
    background: '#334155',
    border: '1px solid #475569',
    borderRadius: '8px',
    padding: '8px 14px',
    color: '#e2e8f0',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  operatorBox: {
    background: '#0f172a',
    borderRadius: '10px',
    padding: '12px',
    border: '1px solid #1e293b',
  },
  operatorLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
  },
  operatorName: { fontSize: '15px', fontWeight: '700', color: '#e2e8f0' },
  operatorPhone: { fontSize: '12px', color: '#94a3b8', marginBottom: '12px' },
  checkoutBtn: {
    width: '100%',
    background: '#14532d',
    border: '1px solid #22c55e',
    borderRadius: '8px',
    padding: '11px',
    color: '#4ade80',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  assignBox: {
    background: '#0f172a',
    borderRadius: '10px',
    padding: '12px',
    border: '1px solid #1e293b',
  },
  assignLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  input: {
    display: 'block',
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  assignBtn: {
    marginTop: '10px',
    width: '100%',
    background: '#1e3a5f',
    border: '1px solid #38bdf8',
    borderRadius: '8px',
    padding: '11px',
    color: '#7dd3fc',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  section: {
    margin: '12px 16px 0',
    background: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #334155',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  sectionToggle: { color: '#64748b', fontSize: '12px' },
  hireRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid #1e293b',
  },
  hireKeke: { fontSize: '13px', fontWeight: '700', color: '#e2e8f0' },
  hireOp: { fontSize: '11px', color: '#64748b', marginTop: '2px' },
  hireRight: { textAlign: 'right' },
  hireRevenue: { fontSize: '13px', fontWeight: '700', color: '#22c55e' },
  hireDate: { fontSize: '10px', color: '#64748b', marginTop: '2px' },
}
