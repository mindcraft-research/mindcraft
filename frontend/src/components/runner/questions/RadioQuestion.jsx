import { useMemo } from 'react'
import styles from '../runner.module.css'

function shuffleWithAnchors(choices) {
  const anchored = choices.filter((c) => c.anchored)
  const free = choices.filter((c) => !c.anchored)
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[free[i], free[j]] = [free[j], free[i]]
  }
  // Re-insert anchored at their original positions
  const result = [...free]
  anchored.forEach((a) => {
    const origIdx = choices.indexOf(a)
    result.splice(origIdx, 0, a)
  })
  return result
}

export default function RadioQuestion({ question, value, onChange }) {
  const choices = useMemo(
    () => question.randomize ? shuffleWithAnchors(question.choices) : question.choices,
    [question.id] // intentionally stable across re-renders
  )

  return (
    <div className={styles.choiceList}>
      {choices.map((c) => {
        const selected = value === c.code
        return (
          <div
            key={c.id}
            className={`${styles.choiceItem} ${selected ? styles.choiceItemSelected : ''}`}
            onClick={() => onChange(c.code)}
          >
            <div className={`${styles.choiceRadio} ${selected ? styles.choiceRadioSelected : ''}`}>
              {selected && <div className={styles.choiceRadioDot} />}
            </div>
            <span className={styles.choiceLabel}>{c.label}</span>
          </div>
        )
      })}
    </div>
  )
}
