import { useState } from 'react'
import styles from '../runner.module.css'

export default function SliderQuestion({ question, value, onChange }) {
  const min = question.settings?.min ?? 0
  const max = question.settings?.max ?? 100
  const labelLeft = question.settings?.labelLeft || ''
  const labelRight = question.settings?.labelRight || ''
  const showValue = question.settings?.showValue
  const hideDefault = question.settings?.hideDefault
  const [touched, setTouched] = useState(!hideDefault)

  const currentVal = value !== undefined ? Number(value) : Math.round((min + max) / 2)

  const handleChange = (e) => {
    setTouched(true)
    onChange(String(e.target.value))
  }

  return (
    <div className={styles.sliderWrap}>
      {showValue && touched && (
        <div className={styles.sliderValue}>{value ?? '—'}</div>
      )}
      <input
        type="range"
        className={styles.sliderInput}
        min={min}
        max={max}
        value={currentVal}
        onChange={handleChange}
        style={{ opacity: hideDefault && !touched ? 0.4 : 1 }}
      />
      <div className={styles.sliderLabels}>
        <span>{labelLeft}</span>
        <span>{labelRight}</span>
      </div>
      {hideDefault && !touched && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--gray-400)' }}>
          Déplacez le curseur pour répondre
        </div>
      )}
    </div>
  )
}
