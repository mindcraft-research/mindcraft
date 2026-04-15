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
  const raw = step.settings?.text || ''
  // Texte brut (textarea) → convertir \n en <br>
  const html = raw.includes('<') ? raw : raw.replace(/\n/g, '<br>')
  return (
    <div className={styles.screen}>
      <div className={styles.instructionBox}>
        <div
          className={styles.instructionText}
          dangerouslySetInnerHTML={{ __html: typeof window !== 'undefined' ? DOMPurify.sanitize(html, { ADD_ATTR: ['style'] }) : html }}
        />
        <button className={styles.instructionBtn} onClick={onContinue}>
          {step.settings?.buttonLabel || 'Commencer'}
        </button>
      </div>
    </div>
  )
}

function StimulusScreen({ step, file, apiBase, textColor = '#fff', fontSize = 56 }) {
  const mime = file.mimetype || ''
  const imgExts = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i
  const isText  = mime === 'text/plain'
  const isImage = mime.startsWith('image/') || imgExts.test(file.url || '') || imgExts.test(file.originalName || '')
  const isAudio = mime.startsWith('audio/')
  const isVideo = mime.startsWith('video/')
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
      {isImage && <img src={src} alt="" className={styles.stimulusImg} onError={(e) => { console.warn('Stimulus load failed:', src); e.target.style.display = 'none' }} />}
      {isAudio && <audio src={src} autoPlay />}
      {isVideo && <video src={src} autoPlay className={styles.stimulusVideo} />}
    </div>
  )
}

function QuestionScreen({ step, file, apiBase, onAnswer }) {
  const [answer, setAnswer] = useState(null)
  const settings = step.settings || {}
  const choices = settings.choices || [{ label: 'Oui' }, { label: 'Non' }]
  const responseType = settings.responseType || 'RADIO'
  const src = file?.url ? `${apiBase}${file.url}` : null
  // Afficher l'image si le mimetype est image/* OU si l'URL contient une extension image
  const imgExts = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i
  const isImage = file?.mimetype?.startsWith('image/') || (file?.url && imgExts.test(file.url)) || (file?.originalName && imgExts.test(file.originalName))

  const handleSubmit = () => {
    if (answer === null || answer === '') return
    onAnswer({
      questionText: settings.text || '',
      responseType,
      answer: String(answer),
      answerLabel: responseType === 'RADIO' ? (choices[answer]?.label || String(answer)) : String(answer),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 32, gap: 24 }}>
      {/* Stimulus image au-dessus de la question */}
      {src && (
        <img
          src={src}
          alt=""
          style={{ maxWidth: '70%', maxHeight: '50vh', objectFit: 'contain', borderRadius: 8 }}
          onError={(e) => { console.warn('Stimulus image failed to load:', src); e.target.style.display = 'none' }}
        />
      )}

      {settings.text && (
        <p style={{ color: '#ddd', fontSize: 17, textAlign: 'center', maxWidth: 600, lineHeight: 1.6 }}>{settings.text}</p>
      )}

      {/* RADIO */}
      {responseType === 'RADIO' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260 }}>
          {choices.map((ch, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setAnswer(i)}
              style={{
                padding: '12px 20px',
                border: answer === i ? '2px solid #1D9E75' : '2px solid #333',
                borderRadius: 8,
                background: answer === i ? 'rgba(29,158,117,.15)' : 'transparent',
                color: answer === i ? '#1D9E75' : '#bbb',
                fontSize: 15,
                fontWeight: answer === i ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all .15s',
                fontFamily: 'var(--font-body)',
              }}
            >
              {ch.label}
            </button>
          ))}
        </div>
      )}

      {/* LIKERT */}
      {responseType === 'LIKERT' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 400 }}>
            <span style={{ fontSize: 12, color: '#888' }}>{settings.leftLabel || ''}</span>
            <span style={{ fontSize: 12, color: '#888' }}>{settings.rightLabel || ''}</span>
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            {Array.from({ length: settings.points || 5 }, (_, i) => (
              <button
                key={i}
                onClick={() => setAnswer(i + 1)}
                style={{
                  width: 44, height: 44,
                  border: answer === i + 1 ? '2px solid #1D9E75' : '2px solid #333',
                  borderRightWidth: i < (settings.points || 5) - 1 ? 1 : 2,
                  background: answer === i + 1 ? 'rgba(29,158,117,.15)' : 'transparent',
                  color: answer === i + 1 ? '#1D9E75' : '#999',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  borderRadius: i === 0 ? '8px 0 0 8px' : i === (settings.points || 5) - 1 ? '0 8px 8px 0' : 0,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SLIDER */}
      {responseType === 'SLIDER' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%', maxWidth: 400 }}>
          <input
            type="range"
            min={settings.min != null ? settings.min : 0}
            max={settings.max != null ? settings.max : 100}
            value={answer != null ? answer : Math.round(((settings.min || 0) + (settings.max || 100)) / 2)}
            onChange={(e) => setAnswer(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#1D9E75' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: 12, color: '#888' }}>{settings.leftLabel || (settings.min ?? 0)}</span>
            <span style={{ fontSize: 18, color: '#1D9E75', fontWeight: 600 }}>{answer != null ? answer : '–'}</span>
            <span style={{ fontSize: 12, color: '#888' }}>{settings.rightLabel || (settings.max ?? 100)}</span>
          </div>
        </div>
      )}

      {/* TEXT */}
      {responseType === 'TEXT' && (
        <textarea
          value={answer || ''}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Votre réponse…"
          style={{ width: '100%', maxWidth: 500, minHeight: 100, padding: 12, background: '#111', border: '2px solid #333', borderRadius: 8, color: '#ddd', fontSize: 14, resize: 'vertical', fontFamily: 'var(--font-body)' }}
        />
      )}

      {/* NUMERIC */}
      {responseType === 'NUMERIC' && (
        <input
          type="number"
          value={answer || ''}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="0"
          style={{ width: 120, padding: 12, background: '#111', border: '2px solid #333', borderRadius: 8, color: '#ddd', fontSize: 20, textAlign: 'center', fontFamily: 'var(--font-body)' }}
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={answer === null || answer === ''}
        style={{
          padding: '12px 36px',
          background: (answer !== null && answer !== '') ? '#1D9E75' : '#222',
          color: (answer !== null && answer !== '') ? '#fff' : '#555',
          border: 'none', borderRadius: 8,
          fontSize: 15, fontWeight: 500, cursor: (answer !== null && answer !== '') ? 'pointer' : 'not-allowed',
          fontFamily: 'var(--font-body)', transition: 'all .15s', marginTop: 8,
        }}
      >
        Continuer
      </button>
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
        } else {
          // Si durée 0 et que la prochaine étape est QUESTION (pas RESPONSE_KEY),
          // avancer immédiatement — la QUESTION affichera le stimulus + la question
          const nextIdx = steps.findIndex((s, idx) => idx > currentStep)
          if (nextIdx !== -1 && steps[nextIdx].type === 'QUESTION') {
            timerRef.current = setTimeout(nextStep, 0)
          }
          // Sinon : le stimulus reste affiché en attendant une réponse clavier
        }
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

      case 'QUESTION': {
        logEvent('question_onset', { text: settings.text })
        // Pas de timer : on attend la réponse de l'utilisateur
        break
      }

      // INSTRUCTION_PAGE, WAIT_KEY — attendent une action utilisateur
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
    const instrTextRaw = instrPhase?.settings?.text || ''
    const instrBtn = instrPhase?.settings?.buttonLabel || ''
    // Le texte vient d'un <textarea> (texte brut) — convertir \n en <br> pour l'affichage HTML
    const instrText = instrTextRaw.includes('<')
      ? instrTextRaw
      : instrTextRaw.replace(/\n/g, '<br>')
    return (
      <div className={styles.screen} style={{ background: bgColor }}>
        <div className={styles.startBox} style={instrText ? { maxWidth: 640 } : undefined}>
          {instrText ? (
            <div
              className={styles.instructionText}
              dangerouslySetInnerHTML={{ __html: typeof window !== 'undefined' ? DOMPurify.sanitize(instrText, { ADD_ATTR: ['style'] }) : instrText }}
              style={{ textAlign: 'left', marginBottom: 8 }}
            />
          ) : (
            <>
              <h2 className={styles.startTitle}>Tâche comportementale</h2>
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

  const handleQuestionAnswer = (answerData) => {
    currentResponseRef.current = {
      ...currentResponseRef.current,
      questionAnswer: answerData.answer,
      questionAnswerLabel: answerData.answerLabel,
      questionText: answerData.questionText,
      questionResponseType: answerData.responseType,
    }
    logEvent('question_response', answerData)
    nextStep()
  }

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
      {type === 'QUESTION'         && <QuestionScreen step={currentStepData} file={currentFile} apiBase={apiBase} onAnswer={handleQuestionAnswer} />}
    </div>
  )
}
