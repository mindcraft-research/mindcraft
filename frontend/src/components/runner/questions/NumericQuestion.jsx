import styles from '../runner.module.css'

export default function NumericQuestion({ question, value = '', onChange }) {
  const min = question.settings?.min
  const max = question.settings?.max
  const errorMsg = question.settings?.errorMsg

  const numVal = value !== '' ? Number(value) : null
  const outOfRange = numVal !== null && ((min !== null && min !== undefined && numVal < min) || (max !== null && max !== undefined && numVal > max))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        type="number"
        className="form-input"
        style={{ fontSize: 14, padding: '12px 14px', width: 200 }}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        placeholder={min !== undefined && max !== undefined ? `${min} – ${max}` : 'Valeur…'}
      />
      {outOfRange && (
        <div style={{ fontSize: 12, color: 'var(--red)' }}>
          {errorMsg || `Veuillez entrer une valeur entre ${min} et ${max}.`}
        </div>
      )}
    </div>
  )
}
