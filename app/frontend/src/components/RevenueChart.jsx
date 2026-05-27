import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid
} from 'recharts'

const fmt = (v) => `₦${(v / 1000).toFixed(1)}k`

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={tt.box}>
      <p style={tt.label}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0', fontSize: '12px' }}>
          {p.name}: ₦{p.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

const tt = {
  box: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '8px 12px',
  },
  label: { color: '#94a3b8', fontSize: '12px', marginBottom: '4px' },
}

export default function RevenueChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#64748b', padding: '32px 0', fontSize: '14px' }}>
        No revenue data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#334155' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmt}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          formatter={(v) => <span style={{ color: '#94a3b8' }}>{v}</span>}
        />
        <Bar dataKey="solar" name="Solar" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        <Bar dataKey="ekeke" name="E-Keke" fill="#22c55e" radius={[3, 3, 0, 0]} />
        <Bar dataKey="pos" name="POS" fill="#38bdf8" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
