import { useMemo } from 'react'
import styles from '../runner.module.css'

function shuffleWithAnchors(choices) {
  const anchored = choices.filter((c) => c.anchored)
  const free = choices.filter((c) => !c.anchored)
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[free[i], free[j]] = [free[j], free[i]]
  }
  const result = [...free]
  anchored.forEach((a) => {
    const origIdx = choices.indexOf(a)
    result.splice(origIdx, 0, a)
  })
  return result
}

export default function ButtonGroupQuestion({ question, value, onChange }) {
  const choices = useMemo(
    () => (question.randomize ? shuffleWithAnchors(question.choices) : question.choices),
    [question.id]
  )

  return (
    <div className={styles.buttonGroupWrap}>
      {choices.map((c) => {
        const selected = value === c.code
        return (
          <button
            key={c.id}
            type="button"
            className={`${styles.buttonGroupBtn} ${selected ? styles.buttonGroupBtnSelected : ''}`}
            onClick={() => onChange(c.code)}
          >
            {c.label}
          </button>
        )
      })}
    </div>
  )
}
