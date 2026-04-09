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

export default function RadioCommentQuestion({ question, value, onChange }) {
  const choices = useMemo(
    () => (question.randomize ? shuffleWithAnchors(question.choices) : question.choices),
    [question.id]
  )

  const commentLabel = question.settings?.commentLabel || 'Commentaire (facultatif)'

  // Support both plain string (backwards compat) and { choice, comment } object
  const selectedCode = value && typeof value === 'object' ? value.choice : value
  const commentText = value && typeof value === 'object' ? (value.comment || '') : ''

  const handleChoiceClick = (code) => {
    onChange({ choice: code, comment: commentText })
  }

  const handleCommentChange = (e) => {
    onChange({ choice: selectedCode || null, comment: e.target.value })
  }

  return (
    <div>
      <div className={styles.choiceList}>
        {choices.map((c) => {
          const selected = selectedCode === c.code
          return (
            <div
              key={c.id}
              className={`${styles.choiceItem} ${selected ? styles.choiceItemSelected : ''}`}
              onClick={() => handleChoiceClick(c.code)}
            >
              <div className={`${styles.choiceRadio} ${selected ? styles.choiceRadioSelected : ''}`}>
                {selected && <div className={styles.choiceRadioDot} />}
              </div>
              <span className={styles.choiceLabel}>{c.label}</span>
            </div>
          )
        })}
      </div>

      <label style={{ display: 'block', marginTop: 16 }}>
        <span
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--gray-600)',
            marginBottom: 6,
          }}
        >
          {commentLabel}
        </span>
        <textarea
          value={commentText}
          onChange={handleCommentChange}
          rows={3}
          style={{
            padding: '10px 14px',
            border: '2px solid var(--gray-200)',
            borderRadius: 8,
            fontSize: 14,
            resize: 'vertical',
            width: '100%',
            marginTop: 12,
            fontFamily: 'var(--font-body)',
            color: 'var(--gray-800)',
            boxSizing: 'border-box',
          }}
        />
      </label>
    </div>
  )
}
