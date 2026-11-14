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

  // Disposition en ligne (settings.choiceLayout = 'row') : tous les choix côte
  // à côte, de largeur égale, l'image au-dessus du bouton. Sert aux échelles
  // en images. Sans ce réglage : la liste verticale habituelle.
  const enLigne = question.settings?.choiceLayout === 'row'

  return (
    <div
      className={styles.choiceList}
      style={enLigne ? { display: 'grid', gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))`, gap: 'clamp(3px, 0.8vw, 8px)' } : undefined}
    >
      {choices.map((c) => {
        const selected = value === c.code
        const hasMedia = !!c.mediaUrl

        return (
          <div
            key={c.id}
            className={`${styles.choiceItem} ${selected ? styles.choiceItemSelected : ''}`}
            onClick={() => onChange(c.code)}
            style={enLigne
              ? { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '10px clamp(2px, 0.6vw, 6px)', textAlign: 'center' }
              : (hasMedia ? { flexDirection: 'column', alignItems: 'flex-start' } : undefined)}
          >
            {hasMedia && <ChoiceMedia c={c} settings={question.settings} enLigne={enLigne} />}

            <div style={enLigne ? { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } : { display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                className={`${styles.choiceRadio} ${selected ? styles.choiceRadioSelected : ''}`}
              >
                {selected && <div className={styles.choiceRadioDot} />}
              </div>
              {(!enLigne || c.label) && <span className={styles.choiceLabel}>{c.label}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
