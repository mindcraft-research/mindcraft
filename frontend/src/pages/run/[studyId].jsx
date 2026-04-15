import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import StudyRunner from '../../components/runner/StudyRunner'
import styles from '../../components/runner/runner.module.css'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

export default function ParticipantPortal() {
  const router = useRouter()
  const { studyId, PROLIFIC_PID, preview, blockId } = router.query

  const [state, setState] = useState('loading') // loading | unavailable | allocating | running | done | error
  const [study, setStudy] = useState(null)
  const [session, setSession] = useState(null)
  const [participantId, setParticipantId] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [previewCond, setPreviewCond] = useState(null)
  const initialized = useRef(false)

  // Attendre que le router soit hydraté avant d'initialiser
  useEffect(() => {
    if (!router.isReady || !studyId || initialized.current) return
    initialized.current = true
    init()
  }, [router.isReady, studyId])

  const init = async () => {
    try {
      const isPreview = !!router.query.preview
      const prolificId = router.query.PROLIFIC_PID || null

      // 1. Résoudre le participantId
      let pid = prolificId || null
      if (!pid) {
        const stored = localStorage.getItem(`experlab_pid_${studyId}`)
        pid = stored || crypto.randomUUID()
        if (!isPreview) localStorage.setItem(`experlab_pid_${studyId}`, pid)
      }
      setParticipantId(pid)

      // 2. Charger l'étude publique
      const previewParam = isPreview ? '?preview=1' : ''
      const studyRes = await fetch(`${API_BASE}/api/run/${studyId}${previewParam}`)

      if (studyRes.status === 404) {
        setState('unavailable')
        setErrorMsg('Cette étude est introuvable.')
        return
      }
      if (studyRes.status === 403) {
        const data = await studyRes.json()
        setState('unavailable')
        setErrorMsg(data.error || "Cette étude n'est pas disponible pour le moment.")
        return
      }
      if (!studyRes.ok) throw new Error("Erreur lors du chargement de l'étude.")

      const { study: studyData, previewBlockOrder, previewCondition } = await studyRes.json()
      setStudy(studyData)

      // 3. En mode preview : pas d'allocation de session, mais utiliser le blockOrder simulé
      if (isPreview) {
        if (previewBlockOrder) {
          setSession({ blockOrder: previewBlockOrder })
        }
        if (previewCondition) setPreviewCond(previewCondition)
        setState('running')
        return
      }

      // 4. Allouer la session (mode normal)
      setState('allocating')
      const metadata = { source: prolificId ? 'prolific' : 'direct', userAgent: navigator.userAgent }
      const allocRes = await fetch(`${API_BASE}/api/studies/${studyId}/sessions/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: pid, metadata }),
      })

      if (allocRes.status === 409) {
        setState('unavailable')
        setErrorMsg('Cette étude est complète. Tous les quotas ont été atteints.')
        return
      }
      if (!allocRes.ok) throw new Error("Erreur lors de l'allocation.")

      const { session: sessionData } = await allocRes.json()
      setSession(sessionData)

      // 5. Marquer la session IN_PROGRESS
      if (sessionData.status === 'ALLOCATED') {
        fetch(`${API_BASE}/api/studies/${studyId}/sessions/${sessionData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'IN_PROGRESS' }),
        }).catch(() => {})
      }

      setState('running')
    } catch (err) {
      setState('error')
      setErrorMsg(err.message || 'Une erreur inattendue est survenue.')
    }
  }

  const handleComplete = async () => {
    // Marquer la session COMPLETED
    if (session?.id) {
      try {
        await fetch(`${API_BASE}/api/studies/${studyId}/sessions/${session.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED' }),
        })
      } catch {}
    }
    setState('done')
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  if (state === 'loading' || state === 'allocating') {
    return (
      <>
        <Head><title>Chargement…</title></Head>
        <div className={styles.loading}>
          {state === 'allocating' ? 'Préparation de votre session…' : 'Chargement…'}
        </div>
      </>
    )
  }

  if (state === 'unavailable' || state === 'error') {
    return (
      <>
        <Head><title>Étude non disponible</title></Head>
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.unavailable}>
              <div className={styles.unavailableIcon}>{state === 'error' ? '⚠' : '🔒'}</div>
              <div className={styles.unavailableTitle}>
                {state === 'error' ? 'Une erreur est survenue' : 'Étude non disponible'}
              </div>
              <div className={styles.unavailableText}>{errorMsg}</div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (state === 'done') {
    return (
      <>
        <Head><title>Étude terminée</title></Head>
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.unavailable}>
              <div className={styles.unavailableIcon}>✓</div>
              <div className={styles.unavailableTitle}>Merci pour votre participation !</div>
              <div className={styles.unavailableText}>Vous pouvez fermer cette page.</div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (state === 'running' && study && participantId) {
    const isPreview = !!router.query.preview
    return (
      <>
        <Head>
          <title>{isPreview ? `[Prévisualisation] ${study.name}` : study.name}</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <StudyRunner
          study={study}
          session={session}
          participantId={participantId}
          onComplete={handleComplete}
          isPreview={isPreview}
          previewCondition={previewCond}
          blockId={router.query.blockId}
        />
      </>
    )
  }

  return null
}
