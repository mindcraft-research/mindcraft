import styles from '../runner.module.css'

export default function NumericQuestion({ question, value = '', onChange }) {
  const min = question.settings?.min
  const max = question.settings?.max
  const errorMsg = question.settings?.errorMsg
  // Réglages propres au type ÉQUATION (issue #143) : jusqu'ici ignorés par le
  // runner, ce qui rendait ÉQUATION identique à NUMÉRIQUE côté participant.
  // - description : rappel du calcul attendu, affiché en aide au-dessus du champ.
  // - unit : unité affichée en suffixe à droite du champ.
  // NUMÉRIQUE n'expose pas ces réglages, donc lui reste inchangé.
  const description = question.settings?.description
  const unit = question.settings?.unit

  const numVal = value !== '' ? Number(value) : null
  const outOfRange = numVal !== null && ((min !== null && min !== undefined && numVal < min) || (max !== null && max !== undefined && numVal > max))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {description && (
        <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>{description}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
        {unit && (
          <span style={{ fontSize: 14, color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>{unit}</span>
        )}
      </div>
      {outOfRange && (
        <div style={{ fontSize: 12, color: 'var(--red)' }}>
          {errorMsg || `Veuillez entrer une valeur entre ${min} et ${max}.`}
        </div>
      )}
    </div>
  )
}
