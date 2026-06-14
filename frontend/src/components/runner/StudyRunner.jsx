import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { evaluateLogicBlock } from '../../lib/logicEvaluator'
import LSLBridge from '../../lib/lslBridge'
import InstructionBlock from './blocks/InstructionBlock'
import QuestionBlock    from './blocks/QuestionBlock'
import StimulusBlock    from './blocks/StimulusBlock'
import DebriefingBlock  from './blocks/DebriefingBlock'
import styles from './runner.module.css'

export default function StudyRunner({ study, session, participantId, onComplete, isPreview, previewCondition, blockId }) {
  // Résoudre les blocs dans l'ordre du session.blockOrder (ou l'ordre par défaut).
  //
  // useMemo CRITIQUE : sans ça, resolveBlockOrder était appelée à chaque
  // render, et son fallback de randomisation des groupes (Math.random())
  // produisait un nouvel ordre à chaque re-render. Conséquences observées
  // par les chercheur·euse·s : un même bloc apparaissait plusieurs fois de
  // suite, certains blocs étaient sautés, le bloc « suivant » se retrouvait
  // déjà rempli (parce que son blockId correspondait au bloc précédent
  // après reshuffle).
  //
  // Note : depuis le fix backend (counterbalancing.js > shuffleRandomGroups),
  // session.blockOrder contient déjà l'ordre randomGroup appliqué pour la
  // session. Le fallback resolveBlockOrder ne shuffle plus côté client ; le
  // useMemo reste néanmoins en place comme défense-en-profondeur.
  const orderedBlocks = useMemo(
    () => resolveBlockOrder(study.blocks, session?.blockOrder),
    [study.blocks, session?.blockOrder],
  )

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

  // Enregistrer l'arrivée du·de la participant·e sur le bloc courant. Permet
  // au chercheur·euse, à l'export, de calculer le temps passé sur chaque
  // page (toggle « Inclure le temps par page »). Skip en mode preview pour
  // ne pas polluer les données.
  useEffect(() => {
    if (isPreview || !currentBlock || !participantId || !study?.id) return
    if (typeof window === 'undefined') return
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
    fetch(`${API_BASE}/api/run/${study.id}/page-visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, blockId: currentBlock.id }),
    }).catch(() => { /* non bloquant : un échec d'envoi ne doit pas casser la passation */ })
  }, [currentBlock?.id, participantId, study?.id, isPreview])

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

    // Pour l'évaluation immédiate des blocs LOGIC qui suivent, on ne peut pas
    // se reposer sur `allResponses` du closure : il est encore stale (le
    // setAllResponses ci-dessus est asynchrone). On construit une vue locale
    // qui inclut les réponses qu'on vient juste de recevoir, sinon les règles
    // basées sur la réponse courante (« Si Continuer = N → Terminer ») ne
    // matchent jamais.
    const responsesAfterCurrent = blockResponses && currentBlock
      ? { ...allResponses, [currentBlock.id]: blockResponses }
      : allResponses

    let nextIdx = currentIndex + 1

    // Évaluer les blocs LOGIC entre le bloc actuel et le suivant
    while (nextIdx < filteredBlocks.length && filteredBlocks[nextIdx]?.type === 'LOGIC') {
      const logicBlock = filteredBlocks[nextIdx]
      const rules = logicBlock.settings?.rules || []
      const defaultAction = logicBlock.settings?.defaultAction || 'CONTINUE'
      // Bug 8a (issue #83) : on récupère aussi le bloc cible de l'action
      // par défaut, qui peut maintenant être configuré dans LogicInspector
      // quand defaultAction === 'JUMP_TO'.
      const defaultTargetBlockId = logicBlock.settings?.defaultTargetBlockId || null

      const context = {
        conditionAssignments: session?.conditionAssignments || [],
        responses: flattenResponses(responsesAfterCurrent),
      }

      const { action, targetBlockId: tid } = evaluateLogicBlock(
        rules, defaultAction, context, defaultTargetBlockId
      )

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
  if (!blockOrder || blockOrder.length === 0) {
    // Fallback : aucune session.blockOrder transmise par le backend (ne
    // devrait plus arriver depuis le fix : design.js + run.js calculent
    // toujours un blockOrder, randomGroup inclus). On retourne juste
    // l'ordre naturel par `order`.
    return [...blocks].sort((a, b) => a.order - b.order)
  }
  // blockOrder est un tableau d'IDs. Il contient déjà la randomisation
  // randomGroup appliquée côté serveur (lib/counterbalancing.js >
  // shuffleRandomGroups), donc on respecte simplement cet ordre — pas
  // de shuffle ici, sous peine de re-randomiser à chaque render et de
  // produire les symptômes du bug (blocs dupliqués / sautés / pré-remplis).
  const blockMap = Object.fromEntries(blocks.map((b) => [b.id, b]))
  return blockOrder.map((id) => blockMap[id]).filter(Boolean)
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
