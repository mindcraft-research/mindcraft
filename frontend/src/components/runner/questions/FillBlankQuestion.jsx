import { useMemo } from 'react'
import styles from './FillBlankQuestion.module.css'

/**
 * FILL_BLANK — texte avec [BLANK] remplacés par des champs de saisie inline.
 * value : objet { "0": "soleil", "1": "palmiers", ... }
 * onChange : (newObj) => void
 */
export default function FillBlankQuestion({ question, value = {}, onChange }) {
  // La phrase avec trous est dans settings.passage (sinon fallback sur text pour rétrocompat)
  const passage = question.settings?.passage || question.text || ''
  const parts = useMemo(() => parseBlanks(passage), [passage])

  const set = (idx, val) => onChange({ ...value, [idx]: val })

  return (
    <div className={styles.wrap}>
      <p className={styles.sentence}>
        {parts.map((part, i) => {
          if (part.type === 'text') {
            return <span key={i}>{part.content}</span>
          }
          // blank
          const blankIdx = String(part.index)
          return (
            <input
              key={i}
              type="text"
              className={`${styles.blank} ${value[blankIdx] ? styles.blankFilled : ''}`}
              value={value[blankIdx] || ''}
              onChange={(e) => set(blankIdx, e.target.value)}
              placeholder="___"
              size={Math.max(6, (value[blankIdx]?.length || 0) + 2)}
            />
          )
        })}
      </p>
    </div>
  )
}

// "Le [BLANK] est bleu et [BLANK] est vert." →
// [{type:'text',content:'Le '},{type:'blank',index:0},{type:'text',content:' est bleu et '},...
function parseBlanks(text) {
  const parts = []
  const re = /\[BLANK\]/gi
  let last = 0
  let idx = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) })
    parts.push({ type: 'blank', index: idx++ })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) })
  return parts
}
