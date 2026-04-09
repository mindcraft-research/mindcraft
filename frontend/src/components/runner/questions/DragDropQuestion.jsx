import { useState, useCallback } from 'react'
import styles from './DragDropQuestion.module.css'

/**
 * DRAG_DROP — glisser des items dans des zones catégorielles.
 *
 * question.choices  : [{ code, label }, ...]   — items à placer
 * question.settings.zones : [{ code, label }, ...] — zones de dépôt
 *
 * value   : { zoneCode: [itemCode, ...], ... }
 * onChange: (newValue) => void
 */
export default function DragDropQuestion({ question, value = {}, onChange }) {
  const items = question.choices || []
  const zones = question.settings?.zones || []

  // Calculer quels items sont encore dans le pool (pas encore placés)
  const placedCodes = new Set(Object.values(value).flat())
  const poolItems   = items.filter(it => !placedCodes.has(it.code))

  // Drag state
  const [dragItem, setDragItem]     = useState(null)  // { code, label }
  const [dragFrom, setDragFrom]     = useState(null)  // 'pool' | zoneCode
  const [overZone, setOverZone]     = useState(null)  // zoneCode | 'pool'

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const startDrag = useCallback((item, fromZone) => {
    setDragItem(item)
    setDragFrom(fromZone)
  }, [])

  const dropOnZone = useCallback((targetZone) => {
    if (!dragItem) return
    setOverZone(null)

    // Retirer l'item de sa zone d'origine
    const next = { ...value }
    if (dragFrom !== 'pool') {
      next[dragFrom] = (next[dragFrom] || []).filter(c => c !== dragItem.code)
      if (next[dragFrom].length === 0) delete next[dragFrom]
    }

    // Placer l'item dans la zone cible
    if (targetZone !== 'pool') {
      next[targetZone] = [...(next[targetZone] || []), dragItem.code]
    }

    onChange(next)
    setDragItem(null)
    setDragFrom(null)
  }, [dragItem, dragFrom, value, onChange])

  const labelOf = (code) => items.find(it => it.code === code)?.label ?? code

  // ── Rendu ─────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.wrap}>

      {/* Pool d'items non placés */}
      <div
        className={`${styles.pool} ${overZone === 'pool' ? styles.poolOver : ''}`}
        onDragOver={e => { e.preventDefault(); setOverZone('pool') }}
        onDragLeave={() => setOverZone(null)}
        onDrop={e => { e.preventDefault(); dropOnZone('pool') }}
      >
        <div className={styles.poolLabel}>
          {poolItems.length === 0
            ? '✓ Tous les éléments ont été placés'
            : `Éléments à placer (${poolItems.length})`}
        </div>
        <div className={styles.chipRow}>
          {poolItems.map(it => (
            <Chip
              key={it.code}
              label={it.label}
              dragging={dragItem?.code === it.code}
              onDragStart={() => startDrag(it, 'pool')}
              onDragEnd={() => { setDragItem(null); setDragFrom(null); setOverZone(null) }}
            />
          ))}
        </div>
      </div>

      {/* Zones de dépôt */}
      <div className={styles.zones}>
        {zones.map(zone => {
          const zoneItems = (value[zone.code] || [])
          const isOver = overZone === zone.code
          return (
            <div
              key={zone.code}
              className={`${styles.zone} ${isOver ? styles.zoneOver : ''} ${zoneItems.length > 0 ? styles.zoneHasItems : ''}`}
              onDragOver={e => { e.preventDefault(); setOverZone(zone.code) }}
              onDragLeave={() => setOverZone(null)}
              onDrop={e => { e.preventDefault(); dropOnZone(zone.code) }}
            >
              <div className={styles.zoneLabel}>{zone.label || zone.code}</div>
              <div className={styles.chipRow}>
                {zoneItems.length === 0 && (
                  <span className={styles.emptyHint}>Déposer ici</span>
                )}
                {zoneItems.map(code => (
                  <Chip
                    key={code}
                    label={labelOf(code)}
                    dragging={dragItem?.code === code}
                    onDragStart={() => startDrag({ code, label: labelOf(code) }, zone.code)}
                    onDragEnd={() => { setDragItem(null); setDragFrom(null); setOverZone(null) }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bouton reset */}
      {placedCodes.size > 0 && (
        <button className={styles.resetBtn} onClick={() => onChange({})}>
          ↺ Recommencer
        </button>
      )}
    </div>
  )
}

// ── Chip draggable ─────────────────────────────────────────────────────────────

function Chip({ label, dragging, onDragStart, onDragEnd }) {
  return (
    <div
      className={`${styles.chip} ${dragging ? styles.chipDragging : ''}`}
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragEnd={onDragEnd}
    >
      <span className={styles.chipHandle}>⠿</span>
      {label}
    </div>
  )
}
