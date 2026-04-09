import styles from '../runner.module.css'

export default function SelectQuestion({ question, value, onChange }) {
  const choices = question.choices || []

  return (
    <div className={styles.selectWrap}>
      <select
        className={styles.selectInput}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">— Choisir une réponse —</option>
        {choices.map((c) => (
          <option key={c.id} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  )
}
