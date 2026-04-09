import styles from './DrillDownQuestion.module.css'

/**
 * DRILL_DOWN — sélection en cascade sur 2 niveaux.
 * value : { l1: 'code1', l2: 'code2' }  ou null
 * onChange : (value) => void
 *
 * Structure des données :
 *   question.choices          → options niveau 1
 *   question.settings.subChoices[choiceCode] → options niveau 2 de ce choix
 */
export default function DrillDownQuestion({ question, value = {}, onChange }) {
  const choices    = question.choices    || []
  const subChoices = question.settings?.subChoices || {}

  const l1 = value?.l1 || null
  const l2 = value?.l2 || null

  const selectL1 = (code) => {
    // Réinitialise l2 si l1 change
    onChange({ l1: code, l2: null })
  }

  const selectL2 = (code) => {
    onChange({ ...value, l2: code })
  }

  const currentSubs = l1 ? (subChoices[l1] || []) : []
  const hasSubLevel = choices.some((c) => (subChoices[c.code] || []).length > 0)

  return (
    <div className={styles.wrap}>
      {/* ── Niveau 1 ── */}
      <div className={styles.levelLabel}>Niveau 1</div>
      <div className={styles.choiceList}>
        {choices.map((c) => {
          const selected = l1 === c.code
          return (
            <div
              key={c.code}
              className={`${styles.choiceItem} ${selected ? styles.selected : ''}`}
              onClick={() => selectL1(c.code)}
            >
              <div className={`${styles.radio} ${selected ? styles.radioSelected : ''}`}>
                {selected && <div className={styles.radioDot} />}
              </div>
              <span className={styles.choiceLabel}>{c.label}</span>
            </div>
          )
        })}
      </div>

      {/* ── Niveau 2 (si sous-choix disponibles pour le l1 sélectionné) ── */}
      {l1 && currentSubs.length > 0 && (
        <div className={styles.sublevel}>
          <div className={styles.sublevelArrow}>↳</div>
          <div className={styles.sublevelContent}>
            <div className={styles.levelLabel}>Niveau 2</div>
            <div className={styles.choiceList}>
              {currentSubs.map((s) => {
                const selected = l2 === s.code
                return (
                  <div
                    key={s.code}
                    className={`${styles.choiceItem} ${selected ? styles.selected : ''}`}
                    onClick={() => selectL2(s.code)}
                  >
                    <div className={`${styles.radio} ${selected ? styles.radioSelected : ''}`}>
                      {selected && <div className={styles.radioDot} />}
                    </div>
                    <span className={styles.choiceLabel}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Aucun sous-niveau configuré : affichage simple */}
      {l1 && currentSubs.length === 0 && hasSubLevel === false && null}
    </div>
  )
}
