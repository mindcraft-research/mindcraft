import { useMemo } from 'react'
import styles from './HighlightQuestion.module.css'

/**
 * HIGHLIGHT — cliquer sur des mots pour les surligner.
 * value : tableau de tokens sélectionnés (strings).
 * onChange : (newArray) => void
 */
export default function HighlightQuestion({ question, value = [], onChange }) {
  // Le texte à surligner est dans settings.passage (sinon fallback sur text pour rétrocompat)
  const passage = question.settings?.passage || question.text || ''
  const tokens = useMemo(() => tokenize(passage), [passage])

  const toggle = (word) => {
    const next = value.includes(word)
      ? value.filter((w) => w !== word)
      : [...value, word]
    onChange(next)
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.text}>
        {tokens.map((tok, i) => {
          if (!tok.isWord) return <span key={i}>{tok.text}</span>
          const selected = value.includes(tok.text)
          return (
            <span
              key={i}
              className={`${styles.word} ${selected ? styles.wordSelected : ''}`}
              onClick={() => toggle(tok.text)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && toggle(tok.text)}
            >
              {tok.text}
            </span>
          )
        })}
      </p>
      {value.length > 0 && (
        <div className={styles.summary}>
          {value.length} mot{value.length > 1 ? 's' : ''} sélectionné{value.length > 1 ? 's' : ''}
          <button className={styles.clearBtn} onClick={() => onChange([])}>Tout effacer</button>
        </div>
      )}
    </div>
  )
}

// Tokenise "Le soleil est beau." → [{text:"Le",isWord:true},{text:" ",isWord:false},...]
function tokenize(text) {
  const re = /([A-Za-zÀ-ÿ0-9'''-]+|[^A-Za-zÀ-ÿ0-9'''-]+)/g
  const tokens = []
  let m
  while ((m = re.exec(text)) !== null) {
    const t = m[0]
    tokens.push({ text: t, isWord: /[A-Za-zÀ-ÿ0-9]/.test(t) })
  }
  return tokens
}
