import { useState, useEffect, useMemo } from 'react'
import styles from '../runner.module.css'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function DropWordQuestion({ question, value = {}, onChange }) {
  const passage = question.settings?.passage || question.text || ''
  const parts = passage.split(/\[BLANK\]/gi)
  const blankCount = parts.length - 1

  // Banque de mots (une ligne par mot)
  const wordBank = useMemo(() => {
    const raw = (question.settings?.wordBank || '').split('\n').map((w) => w.trim()).filter(Boolean)
    return question.settings?.shuffleWords !== false ? shuffle(raw) : raw
  }, [question.id])

  const [filled, setFilled] = useState(() => {
    const init = {}
    for (let i = 0; i < blankCount; i++) init[String(i)] = value[String(i)] || ''
    return init
  })

  // Mots déjà placés
  const usedWords = Object.values(filled).filter(Boolean)

  // Mots encore disponibles dans la banque
  const available = useMemo(() => {
    const used = [...usedWords]
    return wordBank.filter((w) => {
      const idx = used.indexOf(w)
      if (idx !== -1) { used.splice(idx, 1); return false }
      return true
    })
  }, [wordBank, usedWords.join('|')])

  useEffect(() => {
    onChange(filled)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filled)])

  const placeWord = (blankIdx, word) => {
    setFilled((prev) => ({ ...prev, [String(blankIdx)]: word }))
  }

  const clearBlank = (blankIdx) => {
    setFilled((prev) => ({ ...prev, [String(blankIdx)]: '' }))
  }

  // Drag & drop handlers
  const handleDragStart = (e, word) => {
    e.dataTransfer.setData('text/plain', word)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e, blankIdx) => {
    e.preventDefault()
    const word = e.dataTransfer.getData('text/plain')
    if (word) placeWord(blankIdx, word)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  let blankIdx = 0
  return (
    <div className={styles.dropWordWrap}>
      {/* Banque de mots */}
      <div className={styles.dropWordBank}>
        <div className={styles.dropWordBankLabel}>Mots disponibles :</div>
        <div className={styles.dropWordBankList}>
          {available.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>
              Tous les mots ont été placés
            </span>
          )}
          {available.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className={styles.dropWordTag}
              draggable
              onDragStart={(e) => handleDragStart(e, word)}
            >
              {word}
            </span>
          ))}
        </div>
      </div>

      {/* Passage avec blancs */}
      <div className={styles.dropWordPassage}>
        {parts.map((part, i) => {
          const idx = blankIdx
          if (i < parts.length - 1) blankIdx++
          return (
            <span key={i}>
              <span dangerouslySetInnerHTML={{ __html: part }} />
              {i < parts.length - 1 && (
                filled[String(idx)] ? (
                  <span
                    className={styles.dropWordFilled}
                    onClick={() => clearBlank(idx)}
                    title="Cliquez pour retirer"
                  >
                    {filled[String(idx)]}
                    <span className={styles.dropWordFilledX}>×</span>
                  </span>
                ) : (
                  <span
                    className={styles.dropWordSlot}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    onClick={() => {
                      // Fallback clic : placer le premier mot disponible
                      if (available.length > 0) placeWord(idx, available[0])
                    }}
                  >
                    ___
                  </span>
                )
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
