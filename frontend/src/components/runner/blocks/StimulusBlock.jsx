import { useState, useEffect, useRef } from 'react'
import StimulusEngine, { MultiPhaseStimulusEngine } from '../../stimulus/StimulusEngine'
import LSLBridge, { formatMarker } from '../../../lib/lslBridge'
import styles from '../runner.module.css'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

export default function StimulusBlock({ block, participantId, studyId, onComplete, isPreview = false }) {
  const settings = block.settings || {}

  // ── Tâche externe (iframe ou redirect) ──────────────────────────────────────
  if (settings.externalUrl) {
    return (
      <ExternalTask
        settings={settings}
        participantId={participantId}
        studyId={studyId}
        blockId={block.id}
        onComplete={onComplete}
        isPreview={isPreview}
      />
    )
  }

  // ── Tâche trial-based normale ────────────────────────────────────────────────
  return (
    <TrialTask
      block={block}
      participantId={participantId}
      studyId={studyId}
      onComplete={onComplete}
      isPreview={isPreview}
    />
  )
}

// ─── TÂCHE EXTERNE ────────────────────────────────────────────────────────────

function ExternalTask({ settings, participantId, studyId, blockId, onComplete, isPreview = false }) {
  const mode           = settings.externalMode || 'iframe'
  const completionMode = settings.completionMode || 'button'
  const iframeHeight   = settings.iframeHeight || 600
  const btnLabel       = settings.completionButtonLabel || 'J\'ai terminé la tâche'
  const durationSec    = settings.completionDuration || 300
  const [timerLeft, setTimerLeft]   = useState(durationSec)
  const [redirected, setRedirected] = useState(false)
  const iframeRef = useRef(null)
  const lslRef = useRef(null)

  // ── Connexion LSL pour marqueurs de tâche externe ────────────────────────────
  useEffect(() => {
    if (settings.lslEnabled) {
      const bridge = new LSLBridge()
      bridge.connect(settings.lslPort || 12345)
      lslRef.current = bridge
    }
    return () => lslRef.current?.disconnect()
  }, [])

  const sendMarker = (marker) => { if (lslRef.current) lslRef.current.send(marker) }

  const handleTaskStart = () => {
    sendMarker(settings.markerCodes?.taskStart || 'TASK_START')
  }

  const handleTaskEnd = () => {
    sendMarker(settings.markerCodes?.taskEnd || 'TASK_END')
    onComplete?.()
  }

  // Construire l'URL finale : remplacer {participantId}, corriger l'origin si nécessaire
  const buildUrl = (raw) => {
    let url = (raw || '').replace(/\{participantId\}/g, participantId || '')
    // Réécrire les anciennes URLs /uploads/ vers /api/media/files/
    if (url.startsWith('/uploads/')) return `${API_BASE}/api/media/files/${url.replace('/uploads/', '')}`
    // Chemin relatif → préfixer avec le backend
    if (url.startsWith('/')) return `${API_BASE}${url}`
    // URL avec mauvais port (ex: 3001 au lieu de 3002 pour localhost)
    if (url.startsWith('http://localhost:') || url.startsWith('https://localhost:')) {
      const withoutOrigin = url.replace(/^https?:\/\/localhost:\d+/, '')
      if (withoutOrigin.startsWith('/uploads/')) return `${API_BASE}/api/media/files/${withoutOrigin.replace('/uploads/', '')}`
      if (withoutOrigin.startsWith('/')) return `${API_BASE}${withoutOrigin}`
    }
    return url.replace(/\/uploads\//, '/api/media/files/')
  }
  const taskUrl = buildUrl(settings.externalUrl)

  // ── Sauvegarde des résultats de la tâche externe ────────────────────────────
  const saveExternalResults = async (results) => {
    if (!participantId || !studyId || !blockId || !results) return
    // En mode prévisualisation chercheur : ne pas enregistrer en base.
    if (isPreview) return
    try {
      await fetch(`${API_BASE}/api/run/${studyId}/responses/external-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, blockId, data: results }),
      })
    } catch { /* ne pas bloquer la progression */ }
  }

  // ── Écoute des messages de la tâche externe (marqueurs LSL + complétion) ────
  useEffect(() => {
    const handler = (e) => {
      // Marqueurs LSL envoyés par la tâche externe via postMessage.
      // La tâche peut joindre des données d'essai (`data: { trial, code, … }`) :
      // elles sont ajoutées au marqueur sous forme `clé=valeur`, sinon tous
      // les marqueurs d'un même type seraient indiscernables à l'analyse.
      if (e.data?.type === 'mindcraft:marker') {
        sendMarker(formatMarker(e.data.marker, e.data.data))
      }
      // Signal de fin de tâche avec résultats (nouveau protocole)
      if (e.data?.type === 'mindcraft:complete') {
        if (e.data.results) saveExternalResults(e.data.results)
        handleTaskEnd()
      }
      // Signal de fin de tâche simple (rétro-compatibilité)
      if (e.data === 'mindcraft:complete') handleTaskEnd()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // ── Mode durée fixe ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (completionMode !== 'duration') return
    if (timerLeft <= 0) { handleTaskEnd(); return }
    const id = setInterval(() => setTimerLeft(t => {
      if (t <= 1) { clearInterval(id); handleTaskEnd(); return 0 }
      return t - 1
    }), 1000)
    return () => clearInterval(id)
  }, [completionMode])

  // ── Hauteur de l'iframe (mode non immersif) ──────────────────────────────────
  // Espace sous l'iframe : écart de 12 px puis bouton « Terminer » (~48 px) ou
  // ligne d'information (~24 px), plus 16 px de marge basse. Recalculée quand
  // la fenêtre change (F11).
  const [iframeHeightPx, setIframeHeightPx] = useState(null)
  useEffect(() => {
    if (mode !== 'iframe' || settings.immersive) return
    const reserve = completionMode === 'button' ? 60 : completionMode === 'message' || completionMode === 'duration' ? 36 : 0
    const compute = () => {
      const el = iframeRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY
      setIframeHeightPx(Math.max(300, Math.floor(window.innerHeight - top - reserve - 16)))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [mode, completionMode, settings.immersive])

  // ── Envoyer le marqueur TASK_START au chargement de l'iframe ─────────────────
  useEffect(() => {
    if (mode === 'iframe') handleTaskStart()
  }, [])

  // ── Mode redirect ────────────────────────────────────────────────────────────
  if (mode === 'redirect') {
    if (!redirected) {
      const openUrl = () => {
        handleTaskStart()
        setRedirected(true)
        if (settings.externalNewTab) {
          window.open(taskUrl, '_blank')
        } else {
          window.location.href = taskUrl
        }
      }
      return (
        <div className={styles.card} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>↗</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, color: 'var(--navy)', marginBottom: 10 }}>
            Tâche comportementale
          </h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 28 }}>
            Vous allez être redirigé(e) vers la tâche. Revenez sur cette page une fois terminé(e).
          </p>
          <button className={styles.navBtn} onClick={openUrl}>
            Accéder à la tâche →
          </button>
        </div>
      )
    }
    // Après la redirection (nouvel onglet), afficher le bouton de retour
    return (
      <div className={styles.card} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, color: 'var(--navy)', marginBottom: 10 }}>
          La tâche est ouverte dans un autre onglet
        </h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 28 }}>
          Revenez ici une fois que vous avez terminé la tâche, puis cliquez sur le bouton ci-dessous.
        </p>
        <button className={styles.navBtn} onClick={handleTaskEnd}>
          J'ai terminé la tâche — continuer →
        </button>
      </div>
    )
  }

  // ── Mode iFrame immersif ─────────────────────────────────────────────────────
  // Option par bloc (désactivée par défaut) : la tâche occupe exactement
  // l'écran, par-dessus l'en-tête et la barre de progression. Rien ne peut
  // défiler ni se déplacer — nécessaire en oculométrie, où le moindre
  // décalage de la page hôte déplace le stimulus sous les zones d'intérêt.
  if (settings.immersive) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#fff' }}>
        <iframe
          ref={iframeRef}
          src={taskUrl}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          allow="fullscreen; camera; microphone"
          title="Tâche comportementale"
        />
        {completionMode === 'button' && (
          <button
            className={styles.navBtn}
            onClick={handleTaskEnd}
            style={{ position: 'absolute', right: 16, bottom: 16 }}
          >
            {btnLabel}
          </button>
        )}
      </div>
    )
  }

  // ── Mode iFrame ──────────────────────────────────────────────────────────────
  // L'iframe prend toute la largeur et la hauteur restante de l'écran.
  // La hauteur est calculée d'après la position réelle de l'iframe (en-tête,
  // bandeau de prévisualisation, marges) plutôt qu'avec une constante : un
  // `100vh - 80px` ignorait l'en-tête et faisait dépasser la page de ~126 px,
  // d'où une page défilable sous la tâche.
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      width: '100vw', marginLeft: 'calc(-50vw + 50%)',
      padding: '0 16px',
      // Annule la marge basse du conteneur (80 px) pour que la page tienne
      // dans l'écran ; on ne garde que 16 px sous la tâche.
      marginBottom: -64,
      boxSizing: 'border-box',
    }}>
      <iframe
        ref={iframeRef}
        src={taskUrl}
        style={{
          width: '100%',
          height: iframeHeightPx ? `${iframeHeightPx}px` : 'calc(100vh - 180px)',
          border: '1px solid var(--gray-200)',
          borderRadius: 'var(--radius-lg)',
          background: '#fff',
          display: 'block',
        }}
        allow="fullscreen; camera; microphone"
        title="Tâche comportementale"
      />

      {completionMode === 'button' && (
        <button className={styles.navBtn} onClick={handleTaskEnd}>
          {btnLabel}
        </button>
      )}

      {completionMode === 'duration' && timerLeft > 0 && (
        <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
          Fin automatique dans {Math.floor(timerLeft / 60)}:{String(timerLeft % 60).padStart(2, '0')}
        </div>
      )}

      {completionMode === 'message' && (
        <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
          La tâche se terminera automatiquement à la fin.
        </div>
      )}
    </div>
  )
}

// ─── TÂCHE TRIAL-BASED ────────────────────────────────────────────────────────

function TrialTask({ block, participantId, studyId, onComplete, isPreview = false }) {
  // Les données sont déjà incluses dans le bloc via la route /api/run/:studyId
  const files = block.stimulusFiles || []
  const steps = (block.sequenceSteps || []).sort((a, b) => a.order - b.order)
  const settings = block.settings || {}

  if (files.length === 0) {
    return (
      <div className={styles.card} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>⚠</div>
        <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>
          Aucun fichier stimulus configuré pour cette tâche.
        </p>
        <button className={styles.navBtn} style={{ marginTop: 24 }} onClick={onComplete}>
          Continuer
        </button>
      </div>
    )
  }

  // Si l'utilisateur a configuré des phases dans l'onglet « Structure » (au moins
  // une phase TRAINING/TEST/INSTRUCTION/PAUSE), on utilise l'orchestrateur multi-phase
  // pour respecter l'ordre exact qu'il a défini. Sinon, comportement legacy.
  const taskPhases = settings.taskPhases || []
  const hasMultiPhase = taskPhases.some((p) => ['INSTRUCTION', 'TRAINING', 'TEST', 'PAUSE'].includes(p?.type))

  if (hasMultiPhase) {
    return (
      <MultiPhaseStimulusEngine
        block={block}
        blockSettings={settings}
        files={files}
        steps={steps}
        participantId={participantId}
        studyId={studyId}
        onComplete={onComplete}
        apiBase={API_BASE}
        isPreview={isPreview}
      />
    )
  }

  return (
    <StimulusEngine
      block={block}
      blockSettings={settings}
      files={files}
      steps={steps}
      participantId={participantId}
      studyId={studyId}
      onComplete={onComplete}
      apiBase={API_BASE}
      isPreview={isPreview}
    />
  )
}
