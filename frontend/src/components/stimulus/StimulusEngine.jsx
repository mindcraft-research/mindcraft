import { useState, useEffect, useRef, useCallback } from 'react'
import DOMPurify from 'dompurify'
import styles from './StimulusEngine.module.css'
import LSLBridge from '../../lib/lslBridge'

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

const randBetween = (min, max) => Math.round(min + Math.random() * (max - min))

function buildTrialList(files, settings) {
  const reps = settings.repetitions || 1
  let list = []

  if (settings.randomizeByBlock) {
    for (let r = 0; r < reps; r++) {
      const block = [...files]
      if (settings.randomize) block.sort(() => Math.random() - 0.5)
      list = list.concat(block)
    }
  } else {
    for (let r = 0; r < reps; r++) list = list.concat(files)
    if (settings.randomize) list.sort(() => Math.random() - 0.5)
  }

  return list
}

// ─── PHASES D'UN ESSAI ────────────────────────────────────────────────────────

function FixationScreen({ step, fontSize = 48, color = '#fff' }) {
  return (
    <div className={styles.screen}>
      <div className={styles.fixation} style={{ fontSize, color }}>{step.settings?.symbol || '+'}</div>
    </div>
  )
}

function BlankScreen() {
  return <div className={styles.screen} />
}

function WaitKeyScreen({ step }) {
  return (
    <div className={styles.screen}>
      <div className={styles.waitSymbol}>{step.settings?.symbol || '●'}</div>
      <div className={styles.waitHint}>Appuyez sur {step.settings?.key || 'Espace'} pour continuer</div>
    </div>
  )
}

function InstructionScreen({ step, onContinue }) {
  return (
    <div className={styles.screen}>
      <div className={styles.instructionBox}>
        <p className={styles.instructionText}>{step.settings?.text || ''}</p>
        <button className={styles.instructionBtn} onClick={onContinue}>
          {step.settings?.buttonLabel || 'Commencer'}
        </button>
      </div>
    </div>
  )
}

function StimulusScreen({ step, file, apiBase, textColor = '#fff', fontSize = 56 }) {
  const isText  = file.mimetype === 'text/plain'
  const isImage = file.mimetype.startsWith('image/')
  const isAudio = file.mimetype.startsWith('audio/')
  const isVideo = file.mimetype.startsWith('video/')
  const src = `${apiBase}${file.url}`

  const bgStyle = step.settings?.background
    ? { backgroundImage: `url(${step.settings.background})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {}

  if (isText) {
    return (
      <div className={styles.screen} style={bgStyle}>
        <div style={{ fontSize, fontWeight: 700, color: textColor, textAlign: 'center', fontFamily: 'var(--font-heading, sans-serif)' }}>
          {file.originalName?.replace(/\.\w+$/, '') || ''}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.screen} style={bgStyle}>
      {isImage && <img src={src} alt="" className={styles.stimulusImg} />}
      {isAudio && <audio src={src} autoPlay />}
      {isVideo && <video src={src} autoPlay className={styles.stimulusVideo} />}
    </div>
  )
}

function FeedbackScreen({ step, result, correctColor = '#1D9E75', incorrectColor = '#DC2626' }) {
  const text = result === 'correct'
    ? step.settings?.correctText || '✓'
    : result === 'timeout'
    ? step.settings?.timeoutText || 'Trop lent !'
    : step.settings?.incorrectText || '✗'

  const color = result === 'correct' ? correctColor : result === 'timeout' ? '#D97706' : incorrectColor

  return (
    <div className={styles.screen}>
      <div className={styles.feedback} style={{ color }}>{text}</div>
    </div>
  )
}

// ─── MOTEUR PRINCIPAL ─────────────────────────────────────────────────────────

const SIZE_MAP = { small: 32, medium: 48, large: 56, xlarge: 72 }
const FIX_SIZE_MAP = { small: 32, medium: 48, large: 64 }

// Normalise une chaîne pour comparaison : minuscules, sans accents, sans espaces superflus
const normalize = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export default function StimulusEngine({ block, blockSettings, files, steps, participantId, studyId, onComplete, apiBase = 'http://localhost:3002' }) {
  // Apparence personnalisable
  const bgColor       = blockSettings?.bgColor || '#000000'
  const textColor      = blockSettings?.textColor || '#ffffff'
  const stimFontSize   = SIZE_MAP[blockSettings?.stimulusSize] || 56
  const fixFontSize    = FIX_SIZE_MAP[blockSettings?.fixationSize] || 48
  const correctColor   = blockSettings?.correctColor || '#1D9E75'
  const incorrectColor = blockSettings?.incorrectColor || '#DC2626'

  const [phase, setPhase] = useState('idle') // idle | running | done
  const [trialList, setTrialList] = useState([])
  const [currentTrial, setCurrentTrial] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepPhase, setStepPhase] = useState('entering')
  const [trialResult, setTrialResult] = useState(null)
  const [responses, setResponses] = useState([])
  const [isPractice, setIsPractice] = useState(false)

  const t0Ref = useRef(null)
  const timerRef = useRef(null)
  const currentResponseRef = useRef({})
  const eventLogRef = useRef([])
  const lslRef = useRef(null)

  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current) }

  const logEvent = useCallback((event, extra = {}) => {
    eventLogRef.current.push({
      event,
      trial: currentTrial,
      step: currentStep,
      timestamp: performance.now(),
      wallTime: Date.now(),
      ...extra,
    })
  }, [currentTrial, currentStep])

  const sendMarker = useCallback((marker) => {
    if (lslRef.current) lslRef.current.send(marker)
  }, [])

  // ── Connexion LSL (une seule fois au montage) ─────────────────────────────
  useEffect(() => {
    if (blockSettings?.lslEnabled) {
      const bridge = new LSLBridge()
      bridge.connect(blockSettings.lslPort || 12345)
      lslRef.current = bridge
    }
    return () => lslRef.current?.disconnect()
  }, [])

  // ── Construire la liste d'essais ───────────────────────────────────────────
  useEffect(() => {
    if (files.length > 0) {
      const list = buildTrialList(files, blockSettings)
      setTrialList(list)
    }
  }, [files, blockSettings])

  // ── Démarrer ───────────────────────────────────────────────────────────────
  const start = useCallback((practice = false) => {
    setIsPractice(practice)
    setCurrentTrial(0)
    setCurrentStep(0)
    setResponses([])
    setPhase('running')
    currentResponseRef.current = {}
  }, [])

  // ── Étape courante ─────────────────────────────────────────────────────────
  const currentStepData = steps[currentStep]
  const currentFile = trialList[currentTrial]

  // ── Passer à l'étape suivante ──────────────────────────────────────────────
  const nextStep = useCallback(() => {
    clearTimer()
    const next = currentStep + 1
    if (next >= steps.length) {
      // Fin de l'essai — sauvegarder la réponse
      const resp = {
        stimulusFile: currentFile?.originalName || null,
        stimulusCategory: currentFile?.category || null,
        ...currentResponseRef.current,
      }
      setResponses((r) => [...r, resp])
      currentResponseRef.current = {}

      // Prochain essai
      const nextTrial = currentTrial + 1
      const maxTrials = isPractice
        ? Math.min(blockSettings?.practiceTrials || trialList.length, trialList.length)
        : trialList.length
      if (nextTrial >= maxTrials) {
        setPhase('done')
      } else {
        setCurrentTrial(nextTrial)
        setCurrentStep(0)
        setTrialResult(null)
      }
    } else {
      setCurrentStep(next)
      setTrialResult(null)
    }
  }, [currentStep, currentTrial, trialList, steps, currentFile])

  // ── Exécuter l'étape courante ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'running' || !currentStepData) return
    clearTimer()

    const { type, settings = {} } = currentStepData

    switch (type) {
      case 'FIXATION':
      case 'BLANK':
      case 'ITI': {
        if (type === 'FIXATION') {
          logEvent('fixation_onset')
          sendMarker(blockSettings?.markerCodes?.fixation || 'F')
        }
        const min = settings.durationMin || 500
        const max = settings.durationMax || min
        const dur = randBetween(min, max)
        timerRef.current = setTimeout(nextStep, dur)
        break
      }

      case 'STIMULUS': {
        t0Ref.current = performance.now()
        logEvent('stimulus_onset', { stimulus: currentFile?.originalName, category: currentFile?.category })
        sendMarker(blockSettings?.markerCodes?.stimulus || 'S')
        const min = settings.durationMin || 0
        const max = settings.durationMax || min
        if (min > 0) {
          const dur = randBetween(min, max)
          timerRef.current = setTimeout(nextStep, dur)
        }
        // Si durée 0 : le stimulus reste affiché en attendant une réponse clavier
        // (le handler clavier ira chercher le keyMap du RESPONSE_KEY suivant)
        break
      }

      case 'RESPONSE_KEY': {
        logEvent('response_phase_start')
        t0Ref.current = t0Ref.current || performance.now()
        const maxRT = settings.maxResponseTime || 2000
        if (maxRT > 0) {
          timerRef.current = setTimeout(() => {
            currentResponseRef.current = { ...currentResponseRef.current, keyPressed: null, correct: null, rtMs: null, result: 'timeout' }
            setTrialResult('timeout')
            nextStep()
          }, maxRT)
        }
        break
      }

      case 'FEEDBACK': {
        logEvent('feedback_onset', { result: trialResult })
        sendMarker(blockSettings?.markerCodes?.feedback || 'FB')
        const min = settings.durationMin || 500
        const max = settings.durationMax || min
        timerRef.current = setTimeout(nextStep, randBetween(min, max))
        break
      }

      // INSTRUCTION_PAGE, WAIT_KEY, QUESTION — attendent une action utilisateur
      default: break
    }

    return clearTimer
  }, [currentStep, currentTrial, phase, currentStepData, nextStep])

  // ── Gestion clavier ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'running' || !currentStepData) return

    const handleKey = (e) => {
      const { type, settings = {} } = currentStepData

      if (type === 'WAIT_KEY') {
        const waitKey = settings.key || 'Space'
        if (e.code === waitKey) nextStep()
        return
      }

      if (type === 'RESPONSE_KEY' || type === 'STIMULUS') {
        // Trouver le keyMap : soit sur le step courant, soit sur le prochain RESPONSE_KEY
        let keyMap = settings.keyMap || []
        let stepsToSkip = 1 // par défaut, avancer d'un step

        if (type === 'STIMULUS' && keyMap.length === 0) {
          // Chercher le RESPONSE_KEY qui suit dans la séquence
          const respIdx = steps.findIndex((s, idx) => idx > currentStep && s.type === 'RESPONSE_KEY')
          if (respIdx !== -1) {
            keyMap = steps[respIdx].settings?.keyMap || []
            stepsToSkip = respIdx - currentStep + 1 // sauter STIMULUS + RESPONSE_KEY
          }
          if (keyMap.length === 0) return // pas de keyMap trouvé, ignorer la touche
        }

        const match = keyMap.find((km) => km.key === e.code)
        if (!match) return

        clearTimer()
        const rt = t0Ref.current ? Math.round(performance.now() - t0Ref.current) : null
        t0Ref.current = null

        // Vérifier si la touche correspond à la catégorie du stimulus
        // Normalisation : sans accents, minuscules (ex: 'Végétal' == 'vegetal')
        const fileCategory = normalize(currentFile?.category)
        const matchLabel = normalize(match?.label)
        const isCorrect = fileCategory ? matchLabel === fileCategory : true

        currentResponseRef.current = {
          ...currentResponseRef.current,
          keyPressed: e.code,
          keyLabel: match?.label || e.code,
          correct: isCorrect ? 1 : 0,
          rtMs: rt,
        }
        logEvent('response', { key: e.code, label: match?.label, correct: isCorrect, rt })
        sendMarker(blockSettings?.markerCodes?.response || 'R')
        setTrialResult(isCorrect ? 'correct' : 'incorrect')

        // Avancer : si on était sur STIMULUS, sauter directement au step après RESPONSE_KEY
        if (stepsToSkip > 1) {
          const targetStep = currentStep + stepsToSkip
          if (targetStep >= steps.length) {
            // Fin de l'essai
            const resp = {
              stimulusFile: currentFile?.originalName || null,
              stimulusCategory: currentFile?.category || null,
              ...currentResponseRef.current,
            }
            setResponses((r) => [...r, resp])
            currentResponseRef.current = {}
            const nextTr = currentTrial + 1
            const maxTrials = isPractice
              ? Math.min(blockSettings?.practiceTrials || trialList.length, trialList.length)
              : trialList.length
            if (nextTr >= maxTrials) { setPhase('done') }
            else { setCurrentTrial(nextTr); setCurrentStep(0); setTrialResult(null) }
          } else {
            setCurrentStep(targetStep)
          }
        } else {
          nextStep()
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, currentStepData, currentFile, nextStep])

  // ── Soumettre les réponses ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'done' || isPractice) {
      if (phase === 'done' && isPractice) {
        // Recommencer avec les vrais essais après la pratique
        setTimeout(() => start(false), 1000)
      }
      return
    }

    const submit = async () => {
      try {
        await fetch(`${apiBase}/api/stimulus/responses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId, studyId, blockId: block.id, trials: responses, eventLog: eventLogRef.current }),
        })
      } catch {}
      onComplete?.(responses)
    }
    submit()
  }, [phase, responses, isPractice])

  // ── Rendu ──────────────────────────────────────────────────────────────────

  if (phase === 'idle') {
    const hasPractice = blockSettings?.practiceBlock
    const total = trialList.length
    // Chercher la consigne dans les taskPhases
    const instrPhase = (blockSettings?.taskPhases || []).find((p) => p.type === 'INSTRUCTION')
    const instrText = instrPhase?.settings?.text || ''
    const instrBtn = instrPhase?.settings?.buttonLabel || ''
    return (
      <div className={styles.screen} style={{ background: bgColor }}>
        <div className={styles.startBox} style={instrText ? { maxWidth: 640 } : undefined}>
          {instrText ? (
            <div
              className={styles.instructionText}
              dangerouslySetInnerHTML={{ __html: typeof window !== 'undefined' ? DOMPurify.sanitize(instrText) : instrText }}
              style={{ textAlign: 'left', marginBottom: 8 }}
            />
          ) : (
            <>
              <h2 className={styles.startTitle}>Tâche expérimentale</h2>
              <p className={styles.startDesc}>{total} essais au total</p>
            </>
          )}
          {hasPractice && (
            <button className={styles.startBtn} onClick={() => start(true)}>
              {instrBtn || `Commencer par les essais de pratique (${blockSettings.practiceTrials || 8})`}
            </button>
          )}
          <button className={styles.startBtn} style={hasPractice ? { background: 'transparent', border: '1px solid #555', color: '#888' } : undefined} onClick={() => start(false)}>
            {hasPractice ? 'Passer la pratique' : (instrBtn || 'Commencer')}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className={styles.screen} style={{ background: bgColor }}>
        <div className={styles.startBox}>
          <div className={styles.doneIcon}>✓</div>
          <h2 className={styles.startTitle}>Tâche terminée</h2>
          <p className={styles.startDesc}>{responses.length} essais complétés</p>
        </div>
      </div>
    )
  }

  if (!currentStepData || !currentFile) return null

  const { type, settings = {} } = currentStepData
  const progress = Math.round(((currentTrial + 1) / trialList.length) * 100)

  return (
    <div className={styles.engineWrap} style={{ background: bgColor }}>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
      <div className={styles.trialCount}>
        {isPractice ? 'Pratique' : `Essai ${currentTrial + 1} / ${trialList.length}`}
      </div>

      {type === 'INSTRUCTION_PAGE' && <InstructionScreen step={currentStepData} onContinue={nextStep} />}
      {type === 'WAIT_KEY'         && <WaitKeyScreen step={currentStepData} />}
      {type === 'FIXATION'         && <FixationScreen step={currentStepData} fontSize={fixFontSize} color={textColor} />}
      {type === 'BLANK'            && <BlankScreen />}
      {type === 'ITI'              && <BlankScreen />}
      {type === 'STIMULUS'         && <StimulusScreen step={currentStepData} file={currentFile} apiBase={apiBase} textColor={textColor} fontSize={stimFontSize} />}
      {type === 'RESPONSE_KEY'     && <StimulusScreen step={currentStepData} file={currentFile} apiBase={apiBase} textColor={textColor} fontSize={stimFontSize} />}
      {type === 'FEEDBACK'         && <FeedbackScreen step={currentStepData} result={trialResult} correctColor={correctColor} incorrectColor={incorrectColor} />}
    </div>
  )
}
