import styles from '../runner.module.css'

export default function ConstantSumQuestion({ question, value = {}, onChange }) {
  const total = question.settings?.total ?? 100
  const choices = question.choices || []

  const currentSum = choices.reduce((acc, c) => {
    const v = Number(value[c.code] ?? 0)
    return acc + (isNaN(v) ? 0 : v)
  }, 0)

  const handleChange = (code, rawVal) => {
    const num = rawVal === '' ? 0 : Math.max(0, Number(rawVal))
    onChange({ ...value, [code]: isNaN(num) ? 0 : num })
  }

  const sumColor =
    currentSum === total
      ? 'var(--teal, #00b4a0)'
      : currentSum > total
      ? 'var(--red, #e53e3e)'
      : 'var(--gray-500, #718096)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {choices.map((c) => (
        <div
          key={c.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '10px 16px',
            background: '#fff',
            border: '1.5px solid var(--gray-200)',
            borderRadius: 8,
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 14,
              color: 'var(--gray-700)',
              lineHeight: 1.4,
            }}
          >
            {c.label}
          </span>
          <input
            type="number"
            min={0}
            value={value[c.code] ?? ''}
            onChange={(e) => handleChange(c.code, e.target.value)}
            style={{
              width: 80,
              padding: '6px 10px',
              border: '1.5px solid var(--gray-200)',
              borderRadius: 6,
              fontSize: 14,
              textAlign: 'center',
              fontFamily: 'var(--font-body)',
              color: 'var(--gray-800)',
            }}
          />
        </div>
      ))}

      {/* Running total */}
      <div
        style={{
          marginTop: 12,
          padding: '10px 16px',
          background: 'var(--gray-50)',
          border: '1.5px solid var(--gray-200)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--gray-600)', fontWeight: 500 }}>
          Total distribué
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: sumColor }}>
          {currentSum} / {total}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          background: 'var(--gray-200)',
          borderRadius: 99,
          overflow: 'hidden',
          marginTop: 4,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, (currentSum / total) * 100)}%`,
            background: sumColor,
            borderRadius: 99,
            transition: 'width 0.2s ease',
          }}
        />
      </div>
    </div>
  )
}
