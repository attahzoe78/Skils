import React, { useEffect, useState, useCallback } from 'react'
import StatusBadge from '../components/StatusBadge.jsx'

const PACKAGES = {
  '50W':  { deposit: 15000, weekly: 2500, label: '50W – ₦15,000 deposit + ₦2,500/wk' },
  '100W': { deposit: 25000, weekly: 4000, label: '100W – ₦25,000 deposit + ₦4,000/wk' },
  '200W': { deposit: 45000, weekly: 7000, label: '200W – ₦45,000 deposit + ₦7,000/wk' },
}

const fmt = (n) => `₦${Number(n).toLocaleString('en-NG')}`
const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: '2-digit' })
}

const INIT_FORM = { name: '', phone: '', address: '', package: '50W' }

export default function PaygoSolar() {
  const [customers, setCustomers] = useState([])
  const [totals, setTotals] = useState({ deposits_held: 0, weekly_target: 0, overdue_count: 0 })
  const [form, setForm] = useState(INIT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [actionLoading, setActionLoading] = useState({})
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/solar/customers')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setCustomers(json.customers)
      setTotals({
        deposits_held: json.deposits_held,
        weekly_target: json.weekly_target,
        overdue_count: json.overdue_count,
      })
    } catch {
      showToast('Failed to load customers', 'error')
    }
  }, [])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  const handleFormChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setFormError('')
  }

  const handleEnroll = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setFormError('All fields are required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/solar/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Error')
      setForm(INIT_FORM)
      setShowForm(false)
      showToast('Customer enrolled successfully!')
      await loadCustomers()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePay = async (customerId) => {
    setActionLoading((a) => ({ ...a, [`pay_${customerId}`]: true }))
    try {
      const res = await fetch('/api/solar/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      showToast(`Payment of ${fmt(data.amount)} recorded. Next due: ${fmtDate(data.next_due)}`)
      await loadCustomers()
    } catch {
      showToast('Payment failed', 'error')
    } finally {
      setActionLoading((a) => ({ ...a, [`pay_${customerId}`]: false }))
    }
  }

  const handleLock = async (customerId) => {
    setActionLoading((a) => ({ ...a, [`lock_${customerId}`]: true }))
    try {
      const res = await fetch(`/api/solar/lock/${customerId}`, { method: 'POST' })
      if (!res.ok) throw new Error()
      showToast('Customer locked')
      await loadCustomers()
    } catch {
      showToast('Lock failed', 'error')
    } finally {
      setActionLoading((a) => ({ ...a, [`lock_${customerId}`]: false }))
    }
  }

  const handleUnlock = async (customerId) => {
    setActionLoading((a) => ({ ...a, [`unlock_${customerId}`]: true }))
    try {
      const res = await fetch(`/api/solar/unlock/${customerId}`, { method: 'POST' })
      if (!res.ok) throw new Error()
      showToast('Customer unlocked')
      await loadCustomers()
    } catch {
      showToast('Unlock failed', 'error')
    } finally {
      setActionLoading((a) => ({ ...a, [`unlock_${customerId}`]: false }))
    }
  }

  const pkg = PACKAGES[form.package]

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
          <div style={s.title}>☀ PAYGO Solar</div>
          <div style={s.subtitle}>Customer management & payments</div>
        </div>
        <button style={s.addBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? '✕' : '+ Enroll'}
        </button>
      </div>

      {/* Totals */}
      <div style={s.totalsRow}>
        <div style={s.totalItem}>
          <div style={s.totalVal}>{fmt(totals.deposits_held)}</div>
          <div style={s.totalLbl}>Deposits Held</div>
        </div>
        <div style={s.divider} />
        <div style={s.totalItem}>
          <div style={s.totalVal}>{fmt(totals.weekly_target)}</div>
          <div style={s.totalLbl}>Weekly Target</div>
        </div>
        <div style={s.divider} />
        <div style={s.totalItem}>
          <div style={{ ...s.totalVal, color: totals.overdue_count > 0 ? '#f87171' : '#22c55e' }}>
            {totals.overdue_count}
          </div>
          <div style={s.totalLbl}>Overdue</div>
        </div>
      </div>

      {/* Enrollment Form */}
      {showForm && (
        <form onSubmit={handleEnroll} style={s.formBox}>
          <div style={s.formTitle}>New Customer Enrollment</div>
          {formError && <div style={s.formError}>{formError}</div>}
          <label style={s.label}>Full Name</label>
          <input
            style={s.input}
            name="name"
            value={form.name}
            onChange={handleFormChange}
            placeholder="Customer full name"
            autoComplete="off"
          />
          <label style={s.label}>Phone Number</label>
          <input
            style={s.input}
            name="phone"
            value={form.phone}
            onChange={handleFormChange}
            placeholder="e.g. 08012345678"
            type="tel"
          />
          <label style={s.label}>Address</label>
          <input
            style={s.input}
            name="address"
            value={form.address}
            onChange={handleFormChange}
            placeholder="Street / area in Jos"
          />
          <label style={s.label}>Package</label>
          <select style={s.input} name="package" value={form.package} onChange={handleFormChange}>
            {Object.entries(PACKAGES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {pkg && (
            <div style={s.pkgSummary}>
              Deposit: <strong style={{ color: '#f59e0b' }}>{fmt(pkg.deposit)}</strong> &nbsp;|&nbsp;
              Weekly: <strong style={{ color: '#22c55e' }}>{fmt(pkg.weekly)}</strong>
            </div>
          )}
          <button style={s.submitBtn} type="submit" disabled={submitting}>
            {submitting ? 'Enrolling...' : 'Enroll Customer'}
          </button>
        </form>
      )}

      {/* Customer List */}
      <div style={s.listHeader}>
        <span style={s.listTitle}>Customers ({customers.length})</span>
      </div>
      {customers.length === 0 ? (
        <div style={s.emptyMsg}>No customers enrolled yet. Tap "+ Enroll" to add one.</div>
      ) : (
        customers.map((c) => (
          <div key={c.id} style={s.card}>
            <div style={s.cardTop}>
              <div style={s.cardName}>{c.name}</div>
              <StatusBadge status={c.status} />
            </div>
            <div style={s.cardMeta}>
              <span>{c.phone}</span>
              <span style={s.dot}>·</span>
              <span style={{ color: '#f59e0b' }}>{c.package}</span>
              <span style={s.dot}>·</span>
              <span>{fmt(c.weekly_payment)}/wk</span>
            </div>
            <div style={s.cardMeta}>
              <span style={{ color: '#64748b' }}>{c.address}</span>
            </div>
            <div style={s.cardDates}>
              <span>Next due: <strong style={{ color: c.status === 'overdue' ? '#f87171' : '#94a3b8' }}>{fmtDate(c.next_due_at)}</strong></span>
              <span>Paid: <strong style={{ color: '#22c55e' }}>{fmt(c.total_paid)}</strong></span>
            </div>
            <div style={s.cardActions}>
              <button
                style={s.payBtn}
                onClick={() => handlePay(c.id)}
                disabled={actionLoading[`pay_${c.id}`]}
              >
                {actionLoading[`pay_${c.id}`] ? '...' : `✓ Pay ${fmt(c.weekly_payment)}`}
              </button>
              {c.status === 'locked' ? (
                <button
                  style={s.unlockBtn}
                  onClick={() => handleUnlock(c.id)}
                  disabled={actionLoading[`unlock_${c.id}`]}
                >
                  {actionLoading[`unlock_${c.id}`] ? '...' : '🔓 Unlock'}
                </button>
              ) : (
                <button
                  style={s.lockBtn}
                  onClick={() => handleLock(c.id)}
                  disabled={actionLoading[`lock_${c.id}`]}
                >
                  {actionLoading[`lock_${c.id}`] ? '...' : '🔒 Lock'}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

const s = {
  page: { padding: '0 0 16px', minHeight: '100%' },
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
  title: { fontSize: '18px', fontWeight: '800', color: '#fbbf24' },
  subtitle: { fontSize: '11px', color: '#64748b', marginTop: '2px' },
  addBtn: {
    background: '#22c55e',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 14px',
    color: '#0f172a',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
  },
  totalsRow: {
    display: 'flex',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    padding: '12px 0',
  },
  totalItem: {
    flex: 1,
    textAlign: 'center',
  },
  totalVal: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#22c55e',
  },
  totalLbl: {
    fontSize: '10px',
    color: '#64748b',
    marginTop: '2px',
    fontWeight: '600',
  },
  divider: {
    width: '1px',
    background: '#334155',
    margin: '4px 0',
  },
  formBox: {
    margin: '12px 16px',
    background: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
  },
  formTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: '12px',
  },
  formError: {
    background: '#450a0a',
    border: '1px solid #7f1d1d',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    color: '#fca5a5',
    marginBottom: '10px',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    marginBottom: '4px',
    marginTop: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    display: 'block',
    width: '100%',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  pkgSummary: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '8px',
    padding: '8px 12px',
    background: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #1e293b',
  },
  submitBtn: {
    marginTop: '14px',
    width: '100%',
    background: '#22c55e',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    color: '#0f172a',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  listHeader: {
    padding: '12px 16px 6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  emptyMsg: {
    textAlign: 'center',
    color: '#64748b',
    padding: '32px 16px',
    fontSize: '13px',
  },
  card: {
    margin: '0 16px 10px',
    background: '#1e293b',
    borderRadius: '12px',
    padding: '14px',
    border: '1px solid #334155',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  cardName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#e2e8f0',
  },
  cardMeta: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '3px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2px',
    alignItems: 'center',
  },
  dot: { color: '#475569', margin: '0 2px' },
  cardDates: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '6px',
    marginBottom: '10px',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
  },
  payBtn: {
    flex: 1,
    background: '#14532d',
    border: '1px solid #22c55e',
    borderRadius: '8px',
    padding: '9px',
    color: '#4ade80',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  lockBtn: {
    flex: 1,
    background: '#1e1b4b',
    border: '1px solid #4338ca',
    borderRadius: '8px',
    padding: '9px',
    color: '#818cf8',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  unlockBtn: {
    flex: 1,
    background: '#78350f',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    padding: '9px',
    color: '#fbbf24',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
}
