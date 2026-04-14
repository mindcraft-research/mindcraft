import { useState, useEffect, useRef } from 'react'
import StimulusEngine from '../../stimulus/StimulusEngine'
import styles from '../runner.module.css'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

export default function StimulusBlock({ block, participantId, studyId, onComplete }) {
  const settings = block.settings || {}

  // ── Tâche externe (iframe ou redirect) ──────────────────────────────────────
  if (settings.externalUrl) {
    return (
      <ExternalTask
        settings={settings}
        participantId={participantId}
        studyId={studyId}
        onComplete={onComplete}
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
    />
  )
}

// ─── TÂCHE EXTERNE ────────────────────────────────────────────────────────────

function ExternalTask({ settings, participantId, studyId, onComplete }) {
  const mode           = settings.externalMode || 'iframe'
  const completionMode = settings.completionMode || 'button'
  const iframeHeight   = settings.iframeHeight || 600
  const btnLabel       = settings.completionButtonLabel || 'J\'ai terminé la tâche'
  const durationSec    = settings.completionDuration || 300
  const [timerLeft, setTimerLeft]   = useState(durationSec)
  const [redirected, setRedirected] = useState(false)
  const iframeRef = useRef(null)

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

  // ── Mode postMessage ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (completionMode !== 'message') return
    const handler = (e) => {
      if (e.data === 'mindcraft:complete') onComplete?.()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [completionMode, onComplete])

  // ── Mode durée fixe ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (completionMode !== 'duration') return
    if (timerLeft <= 0) { onComplete?.(); return }
    const id = setInterval(() => setTimerLeft(t => {
      if (t <= 1) { clearInterval(id); onComplete?.(); return 0 }
      return t - 1
    }), 1000)
    return () => clearInterval(id)
  }, [completionMode])

  // ── Mode redirect ────────────────────────────────────────────────────────────
  if (mode === 'redirect') {
    if (!redirected) {
      const openUrl = () => {
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
        <button className={styles.navBtn} onClick={onComplete}>
          J'ai terminé la tâche — continuer →
        </button>
      </div>
    )
  }

  // ── Mode iFrame ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <iframe
        ref={iframeRef}
        src={taskUrl}
        style={{
          width: '100%',
          height: iframeHeight,
          border: '1px solid var(--gray-200)',
          borderRadius: 'var(--radius-lg)',
          background: '#fff',
          display: 'block',
        }}
        allow="fullscreen; camera; microphone"
        title="Tâche comportementale"
      />

      {completionMode === 'button' && (
        <button className={styles.navBtn} onClick={onComplete}>
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

function TrialTask({ block, participantId, studyId, onComplete }) {
  // Les données sont déjà incluses dans le bloc via la route /api/run/:studyId
  const files = block.stimulusFiles || []
  const steps = (block.sequenceSteps || []).sort((a, b) => a.order - b.order)

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

  return (
    <StimulusEngine
      block={block}
      blockSettings={block.settings || {}}
      files={files}
      steps={steps}
      participantId={participantId}
      studyId={studyId}
      onComplete={onComplete}
      apiBase={API_BASE}
    />
  )
}
