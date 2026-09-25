import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import StudyRunner from '../../components/runner/StudyRunner'
import { LangContext, stringsFor, translateServerMessage } from '../../lib/runnerStrings'
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

  // Langue de passation (étude multilingue) : imposée par le lien (?lang=en),
  // jamais choisie par le·la participant·e. Le serveur confirme la langue
  // réellement servie (repli sur la langue d'origine si non configurée).
  const requestedLang = typeof router.query.lang === 'string' ? router.query.lang.toLowerCase() : ''
  const [lang, setLang] = useState('fr')
  const T = stringsFor(lang)

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
      // Lecture rétrocompatible : on lit d'abord la nouvelle clé `mindcraft_pid_*`,
      // puis l'ancienne clé `experlab_pid_*` (rebrand ExperLab → MindCraft) afin
      // de ne pas perdre l'identifiant des participants déjà engagés. L'écriture
      // se fait toujours sur la nouvelle clé.
      // Mode présentiel / poste partagé : ?kiosk=1. Plusieurs participant·e·s
      // passent à tour de rôle sur le même navigateur. On NE stocke PAS
      // l'identité dans le localStorage (qui est partagé entre toutes les
      // passations et provoquerait la réutilisation de la session du·de la
      // précédent·e). On utilise sessionStorage : propre à l'onglet, il
      // survit à un rafraîchissement accidentel en cours de passation, mais
      // est réinitialisé par le bouton « Démarrer nouvelle passation » à la fin.
      const isKiosk = !!router.query.kiosk
      let pid = prolificId || null
      if (!pid) {
        if (isKiosk) {
          const k = `mindcraft_kiosk_pid_${studyId}`
          pid = sessionStorage.getItem(k) || crypto.randomUUID()
          sessionStorage.setItem(k, pid)
        } else {
          const stored =
            localStorage.getItem(`mindcraft_pid_${studyId}`) ||
            localStorage.getItem(`experlab_pid_${studyId}`)
          pid = stored || crypto.randomUUID()
          if (!isPreview) localStorage.setItem(`mindcraft_pid_${studyId}`, pid)
        }
      }
      setParticipantId(pid)

      // 2. Charger l'étude publique
      const qs = []
      if (isPreview) qs.push('preview=1')
      if (requestedLang) qs.push(`lang=${encodeURIComponent(requestedLang)}`)
      const studyRes = await fetch(`${API_BASE}/api/run/${studyId}${qs.length ? `?${qs.join('&')}` : ''}`)

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

      const { study: studyData, previewBlockOrder, previewCondition, lang: servedLang } = await studyRes.json()
      setStudy(studyData)
      if (servedLang) setLang(servedLang)

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
      // Langue de passation, reprise dans les exports (colonne `lang`).
      if (requestedLang) metadata.lang = requestedLang
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

  const handleComplete = async (redirectUrl) => {
    // Marquer la session COMPLETED.
    //
    // IMPORTANT (cas Prolific / redirection) : on marque TOUJOURS la session
    // terminée AVANT de rediriger. Auparavant, quand un redirectUrl était
    // défini (URL de complétion Prolific), la redirection se faisait sans
    // passer par ce marquage → la session restait « en cours », completedAt
    // vide, et le·la participant·e n'était pas compté·e comme ayant terminé.
    if (session?.id) {
      try {
        await fetch(`${API_BASE}/api/studies/${studyId}/sessions/${session.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED' }),
        })
      } catch {}
    }
    // Redirection (Prolific, etc.) seulement après le marquage ; sinon écran
    // de remerciement standard.
    if (redirectUrl) {
      window.location.href = redirectUrl
    } else {
      setState('done')
    }
  }

  // Mode présentiel : redémarrer une passation propre pour la personne
  // suivante. On efface l'identité de l'onglet puis on recharge la page,
  // ce qui régénère un nouvel identifiant → nouvelle session → nouvel ordre.
  const handleNewSession = () => {
    const ok = window.confirm(
      'Démarrer une nouvelle passation ?\n\nAssurez-vous que la personne précédente a bien terminé : ses réponses sont déjà enregistrées.'
    )
    if (!ok) return
    try { sessionStorage.removeItem(`mindcraft_kiosk_pid_${studyId}`) } catch {}
    window.location.reload()
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  // Avant que le serveur ait répondu, la langue demandée sert pour les
  // messages système (le serveur confirme ensuite la langue réellement servie).
  const T0 = state === 'loading' || state === 'allocating' ? stringsFor(requestedLang || lang) : T

  if (state === 'loading' || state === 'allocating') {
    return (
      <>
        <Head><title>{T0.loading}</title></Head>
        <div className={styles.loading}>
          {state === 'allocating' ? T0.preparing : T0.loading}
        </div>
      </>
    )
  }

  if (state === 'unavailable' || state === 'error') {
    const Tm = stringsFor(requestedLang || lang)
    return (
      <>
        <Head><title>{Tm.unavailableTitle}</title></Head>
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.unavailable}>
              <div className={styles.unavailableIcon}>{state === 'error' ? '⚠' : '🔒'}</div>
              <div className={styles.unavailableTitle}>
                {state === 'error' ? Tm.errorTitle : Tm.unavailableTitle}
              </div>
              <div className={styles.unavailableText}>{translateServerMessage(requestedLang || lang, errorMsg)}</div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (state === 'done') {
    const isKiosk = !!router.query.kiosk
    return (
      <>
        <Head><title>{T.studyDone}</title></Head>
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.unavailable}>
              <div className={styles.unavailableIcon}>✓</div>
              <div className={styles.unavailableTitle}>{T.doneTitle}</div>
              {isKiosk ? (
                <>
                  <div className={styles.unavailableText}>
                    {T.doneKiosk}
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleNewSession}
                    style={{ marginTop: 24 }}
                  >
                    {T.newSession}
                  </button>
                </>
              ) : (
                <div className={styles.unavailableText}>{T.doneClose}</div>
              )}
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
        <LangContext.Provider value={lang}>
          <StudyRunner
            study={study}
            session={session}
            participantId={participantId}
            onComplete={handleComplete}
            isPreview={isPreview}
            previewCondition={previewCond}
            blockId={router.query.blockId}
          />
        </LangContext.Provider>
      </>
    )
  }

  return null
}
