import { useState, useCallback, useRef, useEffect } from 'react'
import { evaluateLogicBlock } from '../../lib/logicEvaluator'
import LSLBridge from '../../lib/lslBridge'
import InstructionBlock from './blocks/InstructionBlock'
import QuestionBlock    from './blocks/QuestionBlock'
import StimulusBlock    from './blocks/StimulusBlock'
import DebriefingBlock  from './blocks/DebriefingBlock'
import styles from './runner.module.css'

export default function StudyRunner({ study, session, participantId, onComplete, isPreview, previewCondition, blockId }) {
  // Résoudre les blocs dans l'ordre du session.blockOrder (ou l'ordre par défaut)
  const orderedBlocks = resolveBlockOrder(study.blocks, session?.blockOrder)

  const filteredBlocks = blockId
    ? orderedBlocks.filter(b => b.id === blockId)
    : orderedBlocks

  const [currentIndex, setCurrentIndex] = useState(0)
  const [allResponses, setAllResponses] = useState({}) // blockId → responses
  const [blockPreviewDone, setBlockPreviewDone] = useState(false)

  const lslRef = useRef(null)
  const physioConfig = study?.metadata?.physio

  useEffect(() => {
    if (physioConfig?.lslEnabled) {
      const bridge = new LSLBridge()
      bridge.connect(physioConfig.lslPort || 12345)
      lslRef.current = bridge
      // Send study start marker
      bridge.send(physioConfig.markerStudyStart || 'STUDY_START')
    }
    return () => {
      if (lslRef.current) {
        lslRef.current.send(physioConfig?.markerStudyEnd || 'STUDY_END')
        lslRef.current.disconnect()
      }
    }
  }, [])

  // Remettre le scroll en haut à chaque changement de bloc. Sans ça, après
  // un long bloc, le·la participant·e arrive sur le suivant en restant à la
  // position de scroll précédente — souvent en bas de la nouvelle page.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [currentIndex])

  const currentBlock = filteredBlocks[currentIndex]
  // Ne pas compter les blocs LOGIC dans la progression visible
  const visibleBlocks = filteredBlocks.filter(b => b.type !== 'LOGIC')
  const visibleIndex  = visibleBlocks.findIndex(b => b.id === currentBlock?.id)
  const progress = blockId
    ? 100
    : visibleBlocks.length > 0
      ? Math.round((Math.max(visibleIndex, 0) / visibleBlocks.length) * 100)
      : 0

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goToBlock = useCallback((targetBlockId) => {
    const idx = filteredBlocks.findIndex((b) => b.id === targetBlockId)
    if (idx !== -1) setCurrentIndex(idx)
  }, [filteredBlocks])

  const skipToDebriefing = useCallback(() => {
    const debriefIdx = filteredBlocks.findIndex((b) => b.type === 'DEBRIEFING')
    if (debriefIdx !== -1) setCurrentIndex(debriefIdx)
    else onComplete?.()
  }, [filteredBlocks, onComplete])

  const nextBlock = useCallback((blockResponses) => {
    // Enregistrer les réponses de ce bloc
    if (blockResponses && currentBlock) {
      setAllResponses((prev) => ({ ...prev, [currentBlock.id]: blockResponses }))
    }

    let nextIdx = currentIndex + 1

    // Évaluer les blocs LOGIC entre le bloc actuel et le suivant
    while (nextIdx < filteredBlocks.length && filteredBlocks[nextIdx]?.type === 'LOGIC') {
      const logicBlock = filteredBlocks[nextIdx]
      const rules = logicBlock.settings?.rules || []
      const defaultAction = logicBlock.settings?.defaultAction || 'CONTINUE'

      const context = {
        conditionAssignments: session?.conditionAssignments || [],
        responses: flattenResponses(allResponses),
      }

      const { action, targetBlockId: tid } = evaluateLogicBlock(rules, defaultAction, context)

      if (action === 'JUMP_TO' && tid) {
        const idx = filteredBlocks.findIndex((b) => b.id === tid)
        if (idx !== -1) { setCurrentIndex(idx); return }
      } else if (action === 'END_STUDY') {
        onComplete?.()
        return
      } else if (action === 'SKIP_NEXT') {
        nextIdx += 2 // sauter le LOGIC + le bloc suivant
        break
      }
      // CONTINUE → passer au prochain bloc (skip ce LOGIC)
      nextIdx++
    }

    // Send block transition markers
    if (lslRef.current && physioConfig?.lslEnabled) {
      lslRef.current.send(physioConfig.markerBlockEnd || 'BLOCK_END')
      // Small delay to separate end/start
      setTimeout(() => lslRef.current?.send(physioConfig?.markerBlockStart || 'BLOCK_START'), 10)
    }

    if (nextIdx >= filteredBlocks.length) {
      if (blockId) {
        setBlockPreviewDone(true)
      } else {
        onComplete?.()
      }
    } else {
      setCurrentIndex(nextIdx)
    }
  }, [currentIndex, currentBlock, filteredBlocks, allResponses, session, onComplete, blockId])

  const handleDebriefingComplete = useCallback((redirectUrl) => {
    if (redirectUrl) {
      window.location.href = redirectUrl
    } else {
      onComplete?.()
    }
  }, [onComplete])

  if (!currentBlock && !blockPreviewDone) return null

  if (blockPreviewDone) {
    return (
      <div className={styles.page}>
        {isPreview && (
          <div className={styles.previewBanner}>
            ⚠ MODE PRÉVISUALISATION — Les réponses ne sont pas enregistrées{previewCondition ? ` — Condition : ${previewCondition}` : ''}
          </div>
        )}
        <div className={styles.container}>
          <div className={styles.card} style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--navy)', marginBottom: 12 }}>
              Prévisualisation terminée
            </h2>
            <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 28 }}>
              Ce bloc a été prévisualisé avec succès. Vous pouvez fermer cet onglet.
            </p>
            <button className={styles.navBtn} onClick={() => window.close()}>
              Fermer l'onglet
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Bandeau prévisualisation */}
      {isPreview && (
        <div className={styles.previewBanner}>
          ⚠ MODE PRÉVISUALISATION — Les réponses ne sont pas enregistrées{previewCondition ? ` — Condition : ${previewCondition}` : ''}
        </div>
      )}

      {/* Header de marque */}
      <header className={styles.runnerHeader}>
        <div className={styles.runnerHeaderInner}>
          <div className={styles.runnerLogo}>
            <div className={styles.runnerLogoIcon}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M6.5 2.5H9.5V6.5L12.8 13.5H3.2L6.5 6.5V2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.07"/>
                <path d="M5.5 2.5H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M4.5 10.5L11.5 10.5L12.8 13.5H3.2Z" fill="currentColor" fillOpacity="0.28"/>
                <circle cx="8.5" cy="9" r="1" stroke="currentColor" strokeOpacity="0.65" strokeWidth="0.9"/>
                <circle cx="6.8" cy="12" r="0.55" fill="currentColor" fillOpacity="0.55"/>
              </svg>
            </div>
            <span className={styles.runnerLogoName}>MindCraft</span>
          </div>
          <div className={styles.runnerProgressWrap}>
            <div className={styles.runnerProgressBar}>
              <div className={styles.runnerProgressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.runnerProgressLabel}>
              {progress}%
            </span>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        {(currentBlock.type === 'WELCOME' || currentBlock.type === 'INSTRUCTION') && (
          <InstructionBlock key={currentBlock.id} block={currentBlock} onComplete={nextBlock} />
        )}

        {currentBlock.type === 'QUESTION' && (
          <QuestionBlock
            key={currentBlock.id}
            block={currentBlock}
            studyId={study.id}
            participantId={participantId}
            onComplete={nextBlock}
            onSkipToDebriefing={skipToDebriefing}
            previousResponses={flattenResponses(allResponses)}
            isPreview={isPreview}
          />
        )}

        {currentBlock.type === 'STIMULUS' && (
          <StimulusBlock
            key={currentBlock.id}
            block={currentBlock}
            participantId={participantId}
            studyId={study.id}
            onComplete={() => nextBlock()}
            isPreview={isPreview}
          />
        )}

        {currentBlock.type === 'DEBRIEFING' && (
          <DebriefingBlock key={currentBlock.id} block={currentBlock} onComplete={handleDebriefingComplete} />
        )}

        {/* Les blocs LOGIC sont traités en navigation, jamais rendus */}
      </div>
    </div>
  )
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function resolveBlockOrder(blocks, blockOrder) {
  let ordered
  if (!blockOrder || blockOrder.length === 0) {
    ordered = [...blocks].sort((a, b) => a.order - b.order)
  } else {
    // blockOrder est un tableau d'IDs
    const blockMap = Object.fromEntries(blocks.map((b) => [b.id, b]))
    ordered = blockOrder.map((id) => blockMap[id]).filter(Boolean)
  }

  // ── Randomisation inter-blocs par groupe ───────────────────────────────
  // Les blocs qui partagent le même settings.randomGroup (A, B, C…)
  // voient leur ordre mélangé entre eux ; les autres gardent leur position.
  const groups = {}
  ordered.forEach((b, i) => {
    const g = b.settings?.randomGroup
    if (g) {
      if (!groups[g]) groups[g] = []
      groups[g].push({ index: i, block: b })
    }
  })

  // Pour chaque groupe, shuffle les blocs (Fisher-Yates)
  Object.values(groups).forEach((entries) => {
    if (entries.length < 2) return
    const shuffled = entries.map((e) => e.block)
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    // Remettre les blocs mélangés aux positions originales du groupe
    entries.forEach((e, idx) => { ordered[e.index] = shuffled[idx] })
  })

  return ordered
}

function flattenResponses(allResponses) {
  // Fusionner toutes les réponses par questionCode
  const flat = {}
  for (const blockResponses of Object.values(allResponses)) {
    if (typeof blockResponses === 'object' && !Array.isArray(blockResponses)) {
      Object.assign(flat, blockResponses)
    }
  }
  return flat
}
