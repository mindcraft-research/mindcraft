import { useMemo } from 'react'
import styles from '../runner.module.css'
import { ChoiceMedia } from './mediaShared'

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

export default function MediaRadioQuestion({ question, value, onChange }) {
  const choices = useMemo(
    () => (question.randomize ? shuffleWithAnchors(question.choices) : question.choices),
    [question.id]
  )

  return (
    <div className={styles.choiceList}>
      {choices.map((c) => {
        const selected = value === c.code
        const hasMedia = !!c.mediaUrl

        return (
          <div
            key={c.id}
            className={`${styles.choiceItem} ${selected ? styles.choiceItemSelected : ''}`}
            onClick={() => onChange(c.code)}
            style={hasMedia ? { flexDirection: 'column', alignItems: 'flex-start' } : undefined}
          >
            {hasMedia && <ChoiceMedia c={c} settings={question.settings} />}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                className={`${styles.choiceRadio} ${selected ? styles.choiceRadioSelected : ''}`}
              >
                {selected && <div className={styles.choiceRadioDot} />}
              </div>
              <span className={styles.choiceLabel}>{c.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
