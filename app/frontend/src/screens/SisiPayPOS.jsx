import React, { useEffect, useState, useCallback } from 'react'

const COMMISSION_RATE = 0.0075
const fmt = (n) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-NG', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    day: '2-digit',
    month: 'short',
  })
}

const BANKS = ['Jaiz Bank', 'Sterling Bank', 'Polaris Bank', 'Unity Bank', 'Keystone Bank']
const INIT_AGENT_FORM = { agent_name: '', agent_phone: '', bank_partner: BANKS[0] }

export default function SisiPayPOS() {
  const [agents, setAgents] = useState([])
  const [totalCommission, setTotalCommission] = useState(0)
  const [agentForm, setAgentForm] = useState(INIT_AGENT_FORM)
  const [txForms, setTxForms] = useState({})
  const [actionLoading, setActionLoading] = useState({})
  const [toast, setToast] = useState(null)
  const [showRegForm, setShowRegForm] = useState(false)
  const [expandedAgent, setExpandedAgent] = useState(null)
  const [formError, setFormError] = useState('')
  const [submittingAgent, setSubmittingAgent] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/agents')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setAgents(json.agents)
      setTotalCommission(json.total_commission)
    } catch {
      showToast('Failed to load agents', 'error')
    }
  }, [])

  useEffect(() => { loadAgents() }, [loadAgents])

  const handleAgentFormChange = (e) => {
    setAgentForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setFormError('')
  }

  const handleRegisterAgent = async (e) => {
    e.preventDefault()
    if (!agentForm.agent_name.trim() || !agentForm.agent_phone.trim()) {
      setFormError('Agent name and phone are required')
      return
    }
    setSubmittingAgent(true)
    try {
      const res = await fetch('/api/pos/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentForm),
      })
      if (!res.ok) throw new Error()
      const agent = await res.json()
      showToast(`Agent registered! Terminal ID: ${agent.terminal_id}`)
      setAgentForm(INIT_AGENT_FORM)
      setShowRegForm(false)
      await loadAgents()
    } catch {
      setFormError('Registration failed. Please try again.')
    } finally {
      setSubmittingAgent(false)
    }
  }

  const setTxField = (agentId, field, value) => {
    setTxForms((f) => ({
      ...f,
      [agentId]: { ...(f[agentId] || { amount: '' }), [field]: value },
    }))
  }

  const calcCommission = (amountStr) => {
    const n = parseFloat(amountStr)
    if (!n || n <= 0) return null
    return n * COMMISSION_RATE
  }

  const handleRecordTransaction = async (agentId) => {
    const form = txForms[agentId] || {}
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) {
      showToast('Enter a valid transaction amount', 'error')
      return
    }
    setActionLoading((a) => ({ ...a, [`tx_${agentId}`]: true }))
    try {
      const res = await fetch('/api/pos/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, amount }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      showToast(`Transaction recorded. Commission: ${fmt(data.commission)}`)
      setTxForms((f) => ({ ...f, [agentId]: { amount: '' } }))
      await loadAgents()
    } catch {
      showToast('Transaction failed', 'error')
    } finally {
      setActionLoading((a) => ({ ...a, [`tx_${agentId}`]: false }))
    }
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
          <div style={s.title}>₦ Sisi Pay POS</div>
          <div style={s.subtitle}>Agent network & transaction management</div>
        </div>
        <button style={s.addBtn} onClick={() => setShowRegForm((v) => !v)}>
          {showRegForm ? '✕' : '+ Agent'}
        </button>
      </div>

      {/* Government Mandate Notice */}
      <div style={s.mandateBox}>
        <div style={s.mandateIcon}>🏛</div>
        <div>
          <div style={s.mandateTitle}>CBN Regulatory Notice — Nov 2025</div>
          <div style={s.mandateTxt}>
            All POS agent operations must be conducted through a CBN-licensed banking partner. JosEnergy Hub recommends partnering with <strong style={{ color: '#fbbf24' }}>Jaiz Bank</strong> or <strong style={{ color: '#fbbf24' }}>Sterling Bank</strong> for terminal allocation. Ensure agent KYC and terminal IDs are registered before processing any transactions.
          </div>
          <div style={s.mandateTxt2}>
            Commission rate: <strong style={{ color: '#22c55e' }}>0.75%</strong> per transaction, credited to agent account.
          </div>
        </div>
      </div>

      {/* Portfolio Total */}
      <div style={s.portfolioRow}>
        <div style={s.portfolioItem}>
          <div style={s.portfolioVal}>{fmt(totalCommission)}</div>
          <div style={s.portfolioLbl}>Total Portfolio Commission</div>
        </div>
        <div style={s.portfolioItem}>
          <div style={s.portfolioVal}>{agents.length}</div>
          <div style={s.portfolioLbl}>Registered Agents</div>
        </div>
      </div>

      {/* Agent Registration Form */}
      {showRegForm && (
        <form onSubmit={handleRegisterAgent} style={s.formBox}>
          <div style={s.formTitle}>Register New Agent</div>
          <div style={s.terminalNote}>
            Terminal ID will be auto-assigned (SPS-{String(agents.length + 1).padStart(3, '0')})
          </div>
          {formError && <div style={s.formError}>{formError}</div>}
          <label style={s.label}>Agent Full Name</label>
          <input
            style={s.input}
            name="agent_name"
            value={agentForm.agent_name}
            onChange={handleAgentFormChange}
            placeholder="Full name"
            autoComplete="off"
          />
          <label style={s.label}>Phone Number</label>
          <input
            style={s.input}
            name="agent_phone"
            value={agentForm.agent_phone}
            onChange={handleAgentFormChange}
            placeholder="08012345678"
            type="tel"
          />
          <label style={s.label}>Banking Partner</label>
          <select
            style={s.input}
            name="bank_partner"
            value={agentForm.bank_partner}
            onChange={handleAgentFormChange}
          >
            {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <div style={s.bankNote}>
            Note: Jaiz Bank and Sterling Bank are recommended CBN-licensed partners for POS terminal issuance.
          </div>
          <button style={s.submitBtn} type="submit" disabled={submittingAgent}>
            {submittingAgent ? 'Registering...' : 'Register Agent'}
          </button>
        </form>
      )}

      {/* Agent Cards */}
      <div style={s.listHeader}>
        <span style={s.listTitle}>Agent Roster ({agents.length})</span>
      </div>

      {agents.length === 0 ? (
        <div style={s.emptyMsg}>No agents registered yet. Tap "+ Agent" to add one.</div>
      ) : (
        agents.map((agent) => {
          const txForm = txForms[agent.id] || { amount: '' }
          const previewCommission = calcCommission(txForm.amount)
          const isExpanded = expandedAgent === agent.id
          const isRecording = !!actionLoading[`tx_${agent.id}`]

          return (
            <div key={agent.id} style={s.card}>
              {/* Agent Header */}
              <div style={s.agentHeader} onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}>
                <div>
                  <div style={s.terminalId}>{agent.terminal_id}</div>
                  <div style={s.agentName}>{agent.agent_name}</div>
                  <div style={s.agentMeta}>{agent.agent_phone} · {agent.bank_partner}</div>
                </div>
                <div style={s.agentRight}>
                  <div style={s.agentCommission}>{fmt(agent.total_commission)}</div>
                  <div style={s.agentCommLbl}>Commission</div>
                  <span style={s.expandIcon}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Transaction Entry */}
              {isExpanded && (
                <div style={s.txSection}>
                  <div style={s.txTitle}>Record Transaction</div>
                  <div style={s.txRow}>
                    <div style={s.txInputWrap}>
                      <span style={s.txCurrency}>₦</span>
                      <input
                        style={s.txInput}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Transaction amount"
                        value={txForm.amount}
                        onChange={(e) => setTxField(agent.id, 'amount', e.target.value)}
                      />
                    </div>
                  </div>
                  {previewCommission !== null && (
                    <div style={s.commissionPreview}>
                      Commission at 0.75%: <strong style={{ color: '#22c55e' }}>{fmt(previewCommission)}</strong>
                    </div>
                  )}
                  <button
                    style={s.recordBtn}
                    onClick={() => handleRecordTransaction(agent.id)}
                    disabled={isRecording || !txForm.amount}
                  >
                    {isRecording ? 'Recording...' : 'Record Transaction'}
                  </button>

                  {/* Recent Transactions */}
                  {agent.recent_transactions && agent.recent_transactions.length > 0 && (
                    <div style={s.recentTxSection}>
                      <div style={s.recentTxTitle}>Recent Transactions</div>
                      {agent.recent_transactions.map((tx) => (
                        <div key={tx.id} style={s.txRow2}>
                          <div>
                            <div style={s.txAmount}>{fmt(tx.amount)}</div>
                            <div style={s.txTime}>{fmtDate(tx.transacted_at)}</div>
                          </div>
                          <div style={s.txCommission}>+{fmt(tx.commission)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
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
  title: { fontSize: '18px', fontWeight: '800', color: '#38bdf8' },
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
  mandateBox: {
    margin: '12px 16px 0',
    background: '#1c1917',
    border: '1px solid #78350f',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    gap: '12px',
  },
  mandateIcon: { fontSize: '22px', flexShrink: 0 },
  mandateTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#fbbf24',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  mandateTxt: {
    fontSize: '12px',
    color: '#d6d3d1',
    lineHeight: '1.5',
    marginBottom: '6px',
  },
  mandateTxt2: {
    fontSize: '12px',
    color: '#a8a29e',
  },
  portfolioRow: {
    display: 'flex',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    marginTop: '12px',
    padding: '12px 0',
  },
  portfolioItem: {
    flex: 1,
    textAlign: 'center',
    borderRight: '1px solid #334155',
    '&:last-child': { borderRight: 'none' },
  },
  portfolioVal: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#38bdf8',
  },
  portfolioLbl: {
    fontSize: '10px',
    color: '#64748b',
    marginTop: '2px',
    fontWeight: '600',
  },
  formBox: {
    margin: '12px 16px 0',
    background: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
  },
  formTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: '4px',
  },
  terminalNote: {
    fontSize: '12px',
    color: '#38bdf8',
    marginBottom: '12px',
    padding: '6px 10px',
    background: '#0c2340',
    borderRadius: '6px',
    border: '1px solid #1e4a7a',
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
  bankNote: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '8px',
    padding: '6px 10px',
    background: '#0f172a',
    borderRadius: '6px',
  },
  submitBtn: {
    marginTop: '14px',
    width: '100%',
    background: '#38bdf8',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    color: '#0c2340',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  listHeader: {
    padding: '14px 16px 6px',
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
    border: '1px solid #334155',
    overflow: 'hidden',
  },
  agentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '14px',
    cursor: 'pointer',
  },
  terminalId: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#38bdf8',
    letterSpacing: '0.08em',
    marginBottom: '2px',
  },
  agentName: { fontSize: '15px', fontWeight: '700', color: '#e2e8f0' },
  agentMeta: { fontSize: '11px', color: '#64748b', marginTop: '2px' },
  agentRight: { textAlign: 'right' },
  agentCommission: { fontSize: '15px', fontWeight: '800', color: '#22c55e' },
  agentCommLbl: { fontSize: '10px', color: '#64748b' },
  expandIcon: { fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' },
  txSection: {
    borderTop: '1px solid #334155',
    padding: '14px',
    background: '#0f172a',
  },
  txTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '10px',
  },
  txRow: { marginBottom: '8px' },
  txInputWrap: {
    display: 'flex',
    alignItems: 'center',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  txCurrency: {
    padding: '10px 12px',
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: '15px',
    background: '#0c2340',
    borderRight: '1px solid #334155',
  },
  txInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    padding: '10px 12px',
    color: '#e2e8f0',
    fontSize: '15px',
    outline: 'none',
  },
  commissionPreview: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '10px',
    padding: '8px 12px',
    background: '#1e293b',
    borderRadius: '6px',
  },
  recordBtn: {
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
  recentTxSection: { marginTop: '14px' },
  recentTxTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '8px',
  },
  txRow2: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #1e293b',
  },
  txAmount: { fontSize: '13px', fontWeight: '600', color: '#e2e8f0' },
  txTime: { fontSize: '11px', color: '#64748b', marginTop: '2px' },
  txCommission: { fontSize: '13px', fontWeight: '700', color: '#22c55e' },
}
