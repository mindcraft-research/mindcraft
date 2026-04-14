import styles from '../runner.module.css'

export default function LikertQuestion({ question, value, onChange }) {
  const points = question.settings?.points || 5
  const labels = question.settings?.pointLabels || []

  const startFrom = question.settings?.startFrom ?? 1

  return (
    <div className={styles.likertRow}>
      {Array.from({ length: points }, (_, i) => {
        const num = i + startFrom
        const selected = value === String(num)
        return (
          <button
            key={num}
            type="button"
            className={`${styles.likertBtn} ${selected ? styles.likertBtnSelected : ''}`}
            onClick={() => onChange(String(num))}
          >
            <span className={`${styles.likertNum} ${selected ? styles.likertNumSelected : ''}`}>{num}</span>
            {labels[i] && <span className={styles.likertLabelText}>{labels[i]}</span>}
          </button>
        )
      })}
    </div>
  )
}
