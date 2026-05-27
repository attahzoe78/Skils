import React from 'react'

export default function BatteryBar({ level, showLabel = true, height = 12 }) {
  const color =
    level >= 60 ? '#22c55e' :
    level >= 30 ? '#f59e0b' : '#ef4444'

  return (
    <div style={styles.wrapper}>
      <div style={{ ...styles.track, height }}>
        <div
          style={{
            ...styles.fill,
            width: `${level}%`,
            background: color,
            height: '100%',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      {showLabel && (
        <span style={{ ...styles.label, color }}>
          {level}%
        </span>
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  track: {
    flex: 1,
    background: '#334155',
    borderRadius: '6px',
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    borderRadius: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    minWidth: '32px',
    textAlign: 'right',
  },
}
