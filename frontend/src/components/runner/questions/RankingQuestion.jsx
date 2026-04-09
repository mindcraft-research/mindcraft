import { useState, useEffect } from 'react'
import styles from '../runner.module.css'

export default function RankingQuestion({ question, value, onChange }) {
  const [items, setItems] = useState(() => {
    if (value && Array.isArray(value)) {
      return value.map((code) => question.choices.find((c) => c.code === code)).filter(Boolean)
    }
    return [...question.choices]
  })

  const [dragIdx,     setDragIdx]     = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  useEffect(() => {
    onChange(items.map((item) => item.code))
  }, [items])

  const handleDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    const ghost = document.createElement('div')
    ghost.style.cssText = 'width:1px;height:1px;opacity:0;position:fixed;top:-100px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (idx !== dragIdx) setDragOverIdx(idx)
  }

  const handleDrop = (e, toIdx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === toIdx) { reset(); return }
    const next = [...items]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(toIdx, 0, moved)
    setItems(next)
    reset()
  }

  const reset = () => { setDragIdx(null); setDragOverIdx(null) }

  return (
    <div className={styles.rankingList}>
      {items.map((item, i) => (
        <div
          key={item.id || item.code}
          className={[
            styles.rankingItem,
            dragIdx     === i ? styles.rankingDragging  : '',
            dragOverIdx === i ? styles.rankingDragOver  : '',
          ].filter(Boolean).join(' ')}
          draggable
          onDragStart={(e) => handleDragStart(e, i)}
          onDragOver={(e)  => handleDragOver(e, i)}
          onDrop={(e)      => handleDrop(e, i)}
          onDragEnd={reset}
          onDragLeave={() => setDragOverIdx(null)}
        >
          <span className={styles.rankingHandle} title="Glisser pour réordonner">
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
              <circle cx="3" cy="3"  r="1.4" fill="currentColor"/>
              <circle cx="7" cy="3"  r="1.4" fill="currentColor"/>
              <circle cx="3" cy="8"  r="1.4" fill="currentColor"/>
              <circle cx="7" cy="8"  r="1.4" fill="currentColor"/>
              <circle cx="3" cy="13" r="1.4" fill="currentColor"/>
              <circle cx="7" cy="13" r="1.4" fill="currentColor"/>
            </svg>
          </span>
          <span className={styles.rankingIndex}>{i + 1}</span>
          <span className={styles.rankingLabel}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
