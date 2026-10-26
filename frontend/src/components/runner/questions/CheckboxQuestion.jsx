import { useMemo } from 'react'
import styles from '../runner.module.css'
import { limitesChoix, IndicationChoix } from './LimitesChoix'

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

export default function CheckboxQuestion({ question, value = [], onChange }) {
  const choices = useMemo(
    () => question.randomize ? shuffleWithAnchors(question.choices) : question.choices,
    [question.id]
  )

  const { max } = limitesChoix(question.settings)
  const arr = Array.isArray(value) ? value : []
  // Maximum atteint : les choix non cochés sont grisés (on peut décocher).
  const bloque = (selected) => !!max && !selected && arr.length >= max

  const toggle = (code) => {
    if (bloque(arr.includes(code))) return
    onChange(arr.includes(code) ? arr.filter((v) => v !== code) : [...arr, code])
  }

  return (
    <div className={styles.choiceList}>
      <IndicationChoix settings={question.settings} />
      {choices.map((c) => {
        const selected = arr.includes(c.code)
        return (
          <div
            key={c.id}
            className={`${styles.choiceItem} ${selected ? styles.choiceItemSelected : ''} ${bloque(selected) ? styles.choiceItemDisabled : ''}`}
            onClick={() => toggle(c.code)}
            aria-disabled={bloque(selected) || undefined}
          >
            <div className={`${styles.choiceCheck} ${selected ? styles.choiceCheckSelected : ''}`}>
              {selected && '✓'}
            </div>
            <span className={styles.choiceLabel}>{c.label}</span>
          </div>
        )
      })}
    </div>
  )
}
