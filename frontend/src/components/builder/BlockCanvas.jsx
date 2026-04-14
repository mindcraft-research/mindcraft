import { useState } from 'react'
import styles from './BlockCanvas.module.css'

const BLOCK_CONFIG = {
  WELCOME:     { label: "Message d'accueil", cls: 'purple' },
  INSTRUCTION: { label: 'Instruction',       cls: 'purple' },
  QUESTION:    { label: 'Questionnaire',     cls: 'teal' },
  STIMULUS:    { label: 'Tâche',             cls: 'coral' },
  LOGIC:       { label: 'Logique',           cls: 'amber' },
  DEBRIEFING:  { label: 'Message de fin',    cls: 'gray' },
}

function BlockCard({ block, isSelected, onSelect, onDelete, onDuplicate, isDragging, isDragOver }) {
  const cfg = BLOCK_CONFIG[block.type] || BLOCK_CONFIG.INSTRUCTION
  const questionCount = block.questions?.length || 0

  const getPreview = () => {
    if (block.settings?.name)         return block.settings.name
    if (block.type === 'WELCOME')     return block.settings?.title || "Message d'accueil"
    if (block.type === 'INSTRUCTION') return block.settings?.title || 'Sans titre'
    if (block.type === 'DEBRIEFING')  return block.settings?.title || 'Message de fin'
    if (block.type === 'LOGIC')       return `${(block.settings?.conditions || []).length} condition(s)`
    if (block.type === 'QUESTION')    return `${questionCount} élément${questionCount !== 1 ? 's' : ''}`
    if (block.type === 'STIMULUS')    return block.settings?.stimuliCount ? `${block.settings.stimuliCount} stimulus` : 'Configurer la tâche'
    return ''
  }

  return (
    <div
      className={[
        styles.card,
        isSelected  ? styles.selected  : '',
        isDragging  ? styles.dragging  : '',
        isDragOver  ? styles.dragOver  : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onSelect(block.id)}
    >
      {/* ── Poignée de glissement */}
      <div className={styles.dragHandle} title="Glisser pour réordonner">
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <circle cx="3" cy="3"  r="1.4" fill="currentColor"/>
          <circle cx="7" cy="3"  r="1.4" fill="currentColor"/>
          <circle cx="3" cy="8"  r="1.4" fill="currentColor"/>
          <circle cx="7" cy="8"  r="1.4" fill="currentColor"/>
          <circle cx="3" cy="13" r="1.4" fill="currentColor"/>
          <circle cx="7" cy="13" r="1.4" fill="currentColor"/>
        </svg>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={`${styles.badge} ${styles[`badge_${cfg.cls}`]}`}>
            {cfg.label}
          </span>
          {block.settings?.randomGroup && (
            <span className={styles.randomGroupBadge} title={`Groupe de randomisation ${block.settings.randomGroup}`}>
              🔀 {block.settings.randomGroup}
            </span>
          )}
          <span className={styles.preview}>{getPreview()}</span>
        </div>

        {block.type === 'QUESTION' && block.questions?.length > 0 && (() => {
          const order = block.settings?._questionOrder
          const sorted = order?.length
            ? [...block.questions].sort((a, b) => {
                const ai = order.indexOf(a.id)
                const bi = order.indexOf(b.id)
                if (ai === -1) return 1
                if (bi === -1) return -1
                return ai - bi
              })
            : block.questions
          return (
            <div className={styles.questionsList}>
              {sorted.map((q) => (
                <div key={q.id} className={styles.questionChip}>
                  <span className={styles.qCode}>{q.code}</span>
                  <span className={styles.qText}>{q.text?.replace(/<[^>]+>/g, '') || ''}</span>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      <div className={styles.cardActions}>
        <button
          className={styles.duplicateBtn}
          onClick={(e) => { e.stopPropagation(); onDuplicate(block.id) }}
          title="Dupliquer ce bloc"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M10 4V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5.5A1.5 1.5 0 003 10h1" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        </button>
        <button
          className={styles.deleteBtn}
          onClick={(e) => { e.stopPropagation(); onDelete(block.id) }}
          title="Supprimer ce bloc"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

const PHYSIO_LABELS = {
  EEG: 'EEG', ECG: 'ECG', EMG: 'EMG', EDA: 'EDA/GSR',
  EYETRACKING: 'Eye-tracking', fNIRS: 'fNIRS', RESPIRATION: 'Respiration', OTHER: 'Physio',
}

export default function BlockCanvas({ blocks, selectedBlockId, onSelect, onDelete, onDuplicate, onReorder, physioConfig }) {
  const [dragId,     setDragId]     = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  const handleDragStart = (e, blockId) => {
    setDragId(blockId)
    e.dataTransfer.effectAllowed = 'move'
    // transparent drag image to let CSS handle the visual
    const ghost = document.createElement('div')
    ghost.style.cssText = 'width:1px;height:1px;opacity:0;position:fixed;top:-100px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  const handleDragOver = (e, blockId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (blockId !== dragId) setDragOverId(blockId)
  }

  const handleDrop = (e, targetId) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setDragOverId(null)
      return
    }
    const ids = blocks.map((b) => b.id)
    const fromIdx = ids.indexOf(dragId)
    const toIdx   = ids.indexOf(targetId)
    const newOrder = [...ids]
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, dragId)
    onReorder(newOrder)
    setDragId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverId(null)
  }

  return (
    <div className={styles.canvas}>
      {blocks.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="6" width="24" height="20" rx="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M16 12v8M12 16h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className={styles.emptyTitle}>Étude vide</p>
          <p className={styles.emptyDesc}>Clique sur un bloc dans le panneau de gauche pour commencer</p>
        </div>
      ) : (
        <div className={styles.blocksList}>
          {physioConfig?.enabled && (
            <div className={styles.physioBanner}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M1 8h3l2-5 2 10 2-5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>
                <strong>{PHYSIO_LABELS[physioConfig.tool] || 'Mesures physio'}</strong> activé
                {physioConfig.software ? ` · ${physioConfig.software}` : ''}
                {physioConfig.lslEnabled ? ' · LSL' : ''}
              </span>
            </div>
          )}
          {blocks.map((block) => (
            <div
              key={block.id}
              draggable
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragOver={(e)  => handleDragOver(e, block.id)}
              onDrop={(e)      => handleDrop(e, block.id)}
              onDragEnd={handleDragEnd}
              onDragLeave={() => setDragOverId(null)}
            >
              <BlockCard
                block={block}
                isSelected={selectedBlockId === block.id}
                onSelect={onSelect}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                isDragging={dragId === block.id}
                isDragOver={dragOverId === block.id}
              />
            </div>
          ))}
          <div className={styles.addHint}>
            ← Ajoute un bloc depuis le panneau de gauche
          </div>
        </div>
      )}
    </div>
  )
}
