import { Fragment, useEffect, useRef, useState } from 'react'
import styles from './BlockCanvas.module.css'

// ─── Configuration d'affichage des cartes (existant) ───────────────────────
const BLOCK_CONFIG = {
  WELCOME:     { label: "Message d'accueil", cls: 'purple' },
  INSTRUCTION: { label: 'Instruction',       cls: 'purple' },
  QUESTION:    { label: 'Questionnaire',     cls: 'teal' },
  STIMULUS:    { label: 'Tâche',             cls: 'blue' },
  LOGIC:       { label: 'Logique',           cls: 'amber' },
  DEBRIEFING:  { label: 'Message de fin',    cls: 'gray' },
}

// ─── Types disponibles dans le menu « + Insérer ici » ─────────────────────
// Doit refléter les types proposés par BlockPalette pour rester cohérent.
const INSERT_TYPES = [
  { type: 'WELCOME',     label: "Message d'accueil", desc: "Notice d'information",   cls: 'purple' },
  { type: 'QUESTION',    label: 'Questionnaire',      desc: 'Questions, texte, médias', cls: 'teal' },
  { type: 'STIMULUS',    label: 'Tâche',              desc: 'Conception de la tâche',   cls: 'blue' },
  { type: 'LOGIC',       label: 'Logique',            desc: 'Branchement conditionnel', cls: 'amber' },
  { type: 'DEBRIEFING',  label: 'Message de fin',     desc: 'Page de clôture',          cls: 'gray' },
]

function BlockCard({ block, isSelected, onSelect, onDelete, onDuplicate, isDragging }) {
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
        styles[`card_${cfg.cls}`],
        isSelected  ? styles.selected  : '',
        isDragging  ? styles.dragging  : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onSelect(block.id)}
    >
      {/* ── Poignée de glissement ── */}
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
          {block.type === 'STIMULUS' && block.settings?.lslEnabled && (
            <span className={styles.physioBadge} title="Synchronisation physio (LSL) activée">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M2 12h4l3-9 3 18 3-9h4"/></svg>
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

// ─── Zone d'insertion entre deux blocs ────────────────────────────────────
// Sert à la fois de :
//   1. Cible de dépôt (drop indicator) pendant un glisser-déposer
//   2. Bouton « + Insérer ici » qui ouvre un mini menu avec les types
function BlockGap({
  index,
  isDragSession,
  isDropTarget,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  onSelectType,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  const menuRef = useRef(null)

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onCloseMenu()
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [menuOpen, onCloseMenu])

  return (
    <div
      className={[
        styles.gap,
        isDragSession ? styles.gapDuringDrag : '',
        isDropTarget  ? styles.gapDropTarget : '',
        menuOpen      ? styles.gapMenuOpen   : '',
      ].filter(Boolean).join(' ')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Indicateur visuel : fine ligne qui devient un gros trait bleu pendant un drag */}
      <div className={styles.gapLine} />

      {/* Bouton « + Insérer ici » : visible au survol hors drag */}
      {!isDragSession && (
        <button
          type="button"
          className={styles.insertBtn}
          onClick={(e) => { e.stopPropagation(); onOpenMenu() }}
          title="Insérer un bloc à cet endroit"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Insérer ici</span>
        </button>
      )}

      {/* Menu de sélection du type */}
      {menuOpen && (
        <div className={styles.insertMenu} ref={menuRef}>
          <div className={styles.insertMenuTitle}>Quel type de bloc ?</div>
          {INSERT_TYPES.map((bt) => (
            <button
              key={bt.type}
              type="button"
              className={styles.insertMenuItem}
              onClick={() => { onSelectType(bt.type); onCloseMenu() }}
            >
              <span className={`${styles.insertMenuDot} ${styles[`insertMenuDot_${bt.cls}`]}`} />
              <span className={styles.insertMenuItemBody}>
                <span className={styles.insertMenuItemLabel}>{bt.label}</span>
                <span className={styles.insertMenuItemDesc}>{bt.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const PHYSIO_LABELS = {
  EEG: 'EEG', ECG: 'ECG', EMG: 'EMG', EDA: 'EDA/GSR',
  EYETRACKING: 'Eye-tracking', fNIRS: 'fNIRS', RESPIRATION: 'Respiration', OTHER: 'Physio',
}

export default function BlockCanvas({
  blocks, selectedBlockId, onSelect, onDelete, onDuplicate, onReorder, onAddBlock, physioConfig,
}) {
  const [dragId, setDragId] = useState(null)
  const [dragOverGap, setDragOverGap] = useState(null)   // index du gap survolé (0..blocks.length)
  const [insertMenuAt, setInsertMenuAt] = useState(null) // index du gap où le menu d'insertion est ouvert

  // ── Drag & drop : zone de saisie sur la carte ───────────────────────────
  const handleDragStart = (e, blockId) => {
    setDragId(blockId)
    setInsertMenuAt(null) // fermer tout menu ouvert
    e.dataTransfer.effectAllowed = 'move'
    // Image de drag transparente : c'est le CSS qui gère l'effet visuel
    const ghost = document.createElement('div')
    ghost.style.cssText = 'width:1px;height:1px;opacity:0;position:fixed;top:-100px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverGap(null)
  }

  // ── Drop sur un gap = insérer le bloc à cette position ──────────────────
  const handleGapDragOver = (e, gapIdx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverGap(gapIdx)
  }

  const handleGapDrop = (e, gapIdx) => {
    e.preventDefault()
    if (!dragId) { setDragOverGap(null); return }
    const ids = blocks.map((b) => b.id)
    const fromIdx = ids.indexOf(dragId)
    if (fromIdx === -1) { setDragOverGap(null); setDragId(null); return }
    // Calculer la position cible : si on tire un bloc du haut vers un gap plus bas,
    // l'index cible recule de 1 (car le bloc sera retiré de sa position avant d'être réinséré).
    let toIdx = gapIdx
    if (fromIdx < gapIdx) toIdx = gapIdx - 1
    if (toIdx === fromIdx) { setDragOverGap(null); setDragId(null); return }
    const newOrder = ids.filter((id) => id !== dragId)
    newOrder.splice(toIdx, 0, dragId)
    onReorder(newOrder)
    setDragOverGap(null)
    setDragId(null)
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
          <p className={styles.emptyDesc}>
            Cliquez sur un bloc dans le panneau de gauche pour commencer, ou utilisez le bouton « + » ci-dessous.
          </p>
          {/* Premier gap quand l'étude est vide : permet d'ajouter directement */}
          <BlockGap
            index={0}
            isDragSession={false}
            isDropTarget={false}
            menuOpen={insertMenuAt === 0}
            onOpenMenu={() => setInsertMenuAt(0)}
            onCloseMenu={() => setInsertMenuAt(null)}
            onSelectType={(type) => onAddBlock(type, 0)}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => {}}
            onDrop={(e) => e.preventDefault()}
          />
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

          {blocks.map((block, idx) => (
            <Fragment key={block.id}>
              {/* Gap AVANT chaque bloc (idx=0 = tout en haut) */}
              <BlockGap
                index={idx}
                isDragSession={!!dragId}
                isDropTarget={dragOverGap === idx}
                menuOpen={insertMenuAt === idx}
                onOpenMenu={() => setInsertMenuAt(idx)}
                onCloseMenu={() => setInsertMenuAt(null)}
                onSelectType={(type) => onAddBlock(type, idx)}
                onDragOver={(e) => handleGapDragOver(e, idx)}
                onDragLeave={() => setDragOverGap((g) => (g === idx ? null : g))}
                onDrop={(e) => handleGapDrop(e, idx)}
              />

              <div
                draggable
                onDragStart={(e) => handleDragStart(e, block.id)}
                onDragEnd={handleDragEnd}
              >
                <BlockCard
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  isDragging={dragId === block.id}
                />
              </div>
            </Fragment>
          ))}

          {/* Gap final : insertion à la toute fin */}
          <BlockGap
            index={blocks.length}
            isDragSession={!!dragId}
            isDropTarget={dragOverGap === blocks.length}
            menuOpen={insertMenuAt === blocks.length}
            onOpenMenu={() => setInsertMenuAt(blocks.length)}
            onCloseMenu={() => setInsertMenuAt(null)}
            onSelectType={(type) => onAddBlock(type, blocks.length)}
            onDragOver={(e) => handleGapDragOver(e, blocks.length)}
            onDragLeave={() => setDragOverGap((g) => (g === blocks.length ? null : g))}
            onDrop={(e) => handleGapDrop(e, blocks.length)}
          />

          <div className={styles.addHint}>
            Glissez un bloc pour le réordonner, ou cliquez sur « Insérer ici » entre deux blocs.
          </div>
        </div>
      )}
    </div>
  )
}
