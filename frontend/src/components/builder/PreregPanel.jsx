import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { Tooltip, Toggle } from './FormWidgets'
import dlg from '../ConfirmDialog.module.css'

// Préenregistrement de l'étude (modèle OSF Preregistration).
//   - Brouillon : enregistré automatiquement, pré-remplissable depuis la
//     conception (suggestions calculées par le serveur).
//   - Verrouillage (propriétaire) : définitif ; date et heure du serveur,
//     empreinte, PDF, lien relecteur anonyme et lien public.
//   - Après verrouillage : lecture seule, amendements datés et définitifs.
// Le modèle (sections, questions, options) vient du serveur : une seule
// définition, partagée avec le PDF.

const CATEGORIES = [
  { value: 'PRECISION', label: 'Précision', aide: 'Clarifie le texte sans rien changer au protocole.' },
  { value: 'MINEUR', label: 'Écart mineur', aide: 'Changement qui ne touche ni les hypothèses ni les analyses principales (ex. effectif légèrement différent).' },
  { value: 'MAJEUR', label: 'Écart majeur', aide: 'Changement qui touche les hypothèses, les conditions, les mesures principales ou les analyses.' },
]
const libCategorie = (c) => CATEGORIES.find((x) => x.value === c)?.label || c
const dateLongue = (d) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
const empreinteCourte = (h) => String(h || '').slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ')
const carte = { background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }
const petit = { fontSize: 12.5, color: 'var(--gray-500)' }

const estVide = (q, v, auteurs) => {
  if (q.type === 'auteurs') return !auteurs.some((a) => a.name?.trim())
  return Array.isArray(v) ? v.length === 0 : !String(v ?? '').trim()
}
const facultative = (q) => /^Facultatif/.test(q.aide || '')

async function telecharger(url, nomParDefaut) {
  try {
    const res = await api.get(url, { responseType: 'blob' })
    const nom = /filename="([^"]+)"/.exec(res.headers?.['content-disposition'] || '')?.[1] || nomParDefaut
    const lien = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = lien; a.download = nom
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(lien)
  } catch {
    toast.error('Téléchargement impossible.')
  }
}

const copier = async (texte) => {
  try { await navigator.clipboard.writeText(texte); toast.success('Lien copié') } catch { toast.error('Copie impossible') }
}

// ── Champ d'une question ─────────────────────────────────────────────────────
function Champ({ q, valeur, onChange, lecture }) {
  // Lecture seule : la réponse choisie, pas la liste des options.
  if (lecture && (q.type === 'choix' || q.type === 'choixMultiples')) {
    const choisies = q.options.filter((o) => (q.type === 'choix' ? valeur === o.valeur : (valeur || []).includes(o.valeur)))
    return choisies.length
      ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>{choisies.map((o) => <li key={o.valeur}>{o.fr}</li>)}</ul>
      : <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-400)' }}>(pas de réponse)</p>
  }
  if (q.type === 'choix' || q.type === 'choixMultiples') {
    const multiple = q.type === 'choixMultiples'
    const coche = (v) => (multiple ? (valeur || []).includes(v) : valeur === v)
    const basculer = (v) => {
      if (!multiple) return onChange(valeur === v ? '' : v)
      const liste = valeur || []
      onChange(liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v])
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {q.options.map((o) => (
          <label key={o.valeur} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, cursor: lecture ? 'default' : 'pointer' }}>
            <input type={multiple ? 'checkbox' : 'radio'} checked={coche(o.valeur)} disabled={lecture} onChange={() => basculer(o.valeur)} style={{ marginTop: 3 }} />
            <span>{o.fr}<span style={{ ...petit, fontStyle: 'italic' }}> · {o.en}</span></span>
          </label>
        ))}
      </div>
    )
  }
  if (lecture) {
    return <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.55, color: String(valeur ?? '').trim() ? 'inherit' : 'var(--gray-400)' }}>{String(valeur ?? '').trim() || '(pas de réponse)'}</p>
  }
  if (q.type === 'ligne') {
    return <input className="form-input" style={{ width: '100%' }} value={valeur || ''} maxLength={300} onChange={(e) => onChange(e.target.value)} aria-label={q.fr} />
  }
  const lignes = Math.min(14, Math.max(3, String(valeur || '').split('\n').length + 1))
  return <textarea className="form-input" rows={lignes} style={{ width: '100%', resize: 'vertical' }} value={valeur || ''} maxLength={20000} onChange={(e) => onChange(e.target.value)} aria-label={q.fr} />
}

function Auteurs({ auteurs, onChange, lecture }) {
  if (lecture) {
    return auteurs.length
      ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>{auteurs.map((a, i) => <li key={i}>{[a.name, a.affiliation].filter(Boolean).join(', ')}</li>)}</ul>
      : <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-400)' }}>(aucun auteur)</p>
  }
  const maj = (i, champ, v) => onChange(auteurs.map((a, k) => (k === i ? { ...a, [champ]: v } : a)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {auteurs.map((a, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="form-input" style={{ flex: '1 1 160px' }} placeholder="Nom" value={a.name} onChange={(e) => maj(i, 'name', e.target.value)} aria-label={`Nom de l'auteur ${i + 1}`} />
          <input className="form-input" style={{ flex: '1 1 180px' }} placeholder="Affiliation" value={a.affiliation} onChange={(e) => maj(i, 'affiliation', e.target.value)} aria-label={`Affiliation de l'auteur ${i + 1}`} />
          <input className="form-input" style={{ flex: '1 1 180px' }} placeholder="E-mail (facultatif)" type="email" value={a.email} onChange={(e) => maj(i, 'email', e.target.value)} aria-label={`E-mail de l'auteur ${i + 1}`} />
          <button type="button" className="btn btn-sm" onClick={() => onChange(auteurs.filter((_, k) => k !== i))} aria-label={`Retirer l'auteur ${i + 1}`}>Retirer</button>
        </div>
      ))}
      <div><button type="button" className="btn btn-sm" onClick={() => onChange([...auteurs, { name: '', affiliation: '', email: '' }])}>+ Ajouter un auteur</button></div>
    </div>
  )
}

// ── Fenêtre de verrouillage ──────────────────────────────────────────────────
function FenetreVerrouillage({ manquantsCourants, nbSessions, onAnnuler, onVerrouiller, envoi }) {
  const [compris, setCompris] = useState(false)
  const bloque = manquantsCourants.obligatoires.length > 0
  return (
    <div className={dlg.overlay} onMouseDown={onAnnuler} role="presentation">
      <div className={dlg.dialog} role="alertdialog" aria-modal="true" aria-labelledby="verrou-titre" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 520, textAlign: 'left' }}>
        <h2 id="verrou-titre" className={dlg.title} style={{ color: 'var(--gray-900, #111827)' }}>Verrouiller le préenregistrement ?</h2>
        {bloque ? (
          <p className={dlg.text} style={{ color: 'var(--red)' }}>À compléter avant de verrouiller : {manquantsCourants.obligatoires.join(', ')}.</p>
        ) : (
          <>
            <p className={dlg.text}>Une fois verrouillé :</p>
            <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6 }}>
              <li>MindCraft enregistre la date et l’heure, et calcule une empreinte du texte ;</li>
              <li>le texte ne peut <strong>plus jamais être modifié</strong> : les ajouts se font par amendements datés ;</li>
              <li>un PDF, un lien pour relecteur anonyme et un lien public (désactivé au départ) sont créés ;</li>
              <li>le préenregistrement est conservé même si l’étude ou votre compte est supprimé.</li>
            </ul>
            {manquantsCourants.vides.length > 0 && (
              <p className={dlg.detail} style={{ textAlign: 'left' }}>Sans réponse : {manquantsCourants.vides.join(', ')}.</p>
            )}
            {nbSessions > 0 && (
              <p className={dlg.detail} style={{ textAlign: 'left', color: '#92400e' }}>
                {nbSessions} participant{nbSessions > 1 ? 's ont' : ' a'} déjà commencé l’étude : ce sera indiqué dans le cahier de labo.
              </p>
            )}
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, margin: '12px 0 4px', cursor: 'pointer' }}>
              <input type="checkbox" checked={compris} onChange={(e) => setCompris(e.target.checked)} style={{ marginTop: 3 }} />
              J’ai relu le texte et je comprends qu’il ne pourra plus être modifié.
            </label>
          </>
        )}
        <div className={dlg.actions}>
          <button type="button" className="btn btn-secondary" onClick={onAnnuler}>Annuler</button>
          {!bloque && <button type="button" className="btn btn-primary" disabled={!compris || envoi} onClick={onVerrouiller}>{envoi ? 'Verrouillage…' : 'Verrouiller'}</button>}
        </div>
      </div>
    </div>
  )
}

export default function PreregPanel({ studyId, studyName, onLocked }) {
  const queryClient = useQueryClient()
  const cle = ['prereg', studyId]
  const { data, isLoading } = useQuery({
    queryKey: cle,
    queryFn: async () => (await api.get(`/api/studies/${studyId}/prereg`)).data,
    enabled: !!studyId,
  })
  const prereg = data?.prereg
  const modele = data?.template
  const verrouille = prereg?.status === 'LOCKED'
  const lecture = verrouille || !data?.canWrite

  // Brouillon local, enregistré automatiquement (1,2 s après la dernière frappe).
  const [answers, setAnswers] = useState({})
  const [authors, setAuthors] = useState([])
  const [language, setLanguage] = useState('fr')
  const [sale, setSale] = useState(false)
  const [etat, setEtat] = useState('') // '', 'enregistrement', 'enregistré', 'erreur'
  const [ouvertes, setOuvertes] = useState({}) // propositions affichées
  const [verrouOuvert, setVerrouOuvert] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const charge = useRef(false)

  useEffect(() => {
    if (!data || charge.current) return
    charge.current = true
    setAnswers(prereg?.answers || {})
    setAuthors(prereg?.authors || [])
    setLanguage(prereg?.language || 'fr')
  }, [data, prereg])

  useEffect(() => {
    if (!sale || lecture) return undefined
    const t = setTimeout(async () => {
      setEtat('enregistrement')
      try {
        const res = await api.put(`/api/studies/${studyId}/prereg`, { answers, authors, language })
        const langueAvant = data?.prereg?.language || 'fr'
        queryClient.setQueryData(cle, (old) => (old ? { ...old, prereg: res.data.prereg, manquants: res.data.manquants } : old))
        // Langue changée : propositions recalculées dans la nouvelle langue.
        if (language !== langueAvant) queryClient.invalidateQueries({ queryKey: cle })
        setSale(false)
        setEtat('enregistré')
      } catch (err) {
        setEtat('erreur')
        toast.error(err?.response?.data?.error || 'Le brouillon n’a pas pu être enregistré.')
      }
    }, 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, authors, language, sale, lecture, studyId])

  const modifier = (k, v) => { setAnswers((a) => ({ ...a, [k]: v })); setSale(true) }

  if (isLoading || !modele) return <p style={{ color: 'var(--gray-400)' }}>Chargement…</p>

  const questions = modele.sections.flatMap((s) => s.questions)
  const suggestions = data.suggestions || {}
  const aRemplir = questions.filter((q) => !facultative(q))
  const remplies = aRemplir.filter((q) => !estVide(q, answers[q.cle], authors)).length
  const manquantsCourants = {
    obligatoires: questions.filter((q) => q.obligatoire && estVide(q, answers[q.cle], authors)).map((q) => q.fr),
    vides: questions.filter((q) => !q.obligatoire && !facultative(q) && estVide(q, answers[q.cle], authors)).map((q) => q.fr),
  }
  const vides = Object.keys(suggestions).filter((k) => estVide(questions.find((q) => q.cle === k) || {}, answers[k], authors))

  const preRemplir = () => {
    if (!vides.length) return
    setAnswers((a) => ({ ...a, ...Object.fromEntries(vides.map((k) => [k, suggestions[k]])) }))
    setSale(true)
    toast.success(`${vides.length} réponse${vides.length > 1 ? 's' : ''} pré-remplie${vides.length > 1 ? 's' : ''} : relisez et complétez.`)
  }

  const verrouiller = async () => {
    setEnvoi(true)
    try {
      // Dernières frappes d'abord, puis verrouillage.
      if (sale) await api.put(`/api/studies/${studyId}/prereg`, { answers, authors, language })
      await api.post(`/api/studies/${studyId}/prereg/lock`, { confirm: true })
      setSale(false); setVerrouOuvert(false)
      await queryClient.invalidateQueries({ queryKey: cle })
      queryClient.invalidateQueries({ queryKey: ['notebook', studyId] })
      onLocked?.()
      toast.success('Préenregistrement verrouillé')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Verrouillage impossible.')
    } finally {
      setEnvoi(false)
    }
  }

  const basculerPublic = async (enabled) => {
    try {
      const res = await api.patch(`/api/studies/${studyId}/prereg/public`, { enabled })
      queryClient.setQueryData(cle, (old) => ({ ...old, prereg: res.data.prereg }))
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Modification impossible.')
    }
  }

  const nomPdf = `preenregistrement_${(studyName || studyId).replace(/[^\w]/g, '_')}`

  // Retiré à la demande des auteurs (administration) : contenu effacé.
  if (prereg?.withdrawnAt) {
    return (
      <div style={{ maxWidth: 900 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 18 }}>Préenregistrement</h2>
        <div style={{ ...carte, borderColor: '#fecaca', background: '#fef2f2' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#991b1b', fontWeight: 600 }}>
            Retiré le {dateLongue(prereg.withdrawnAt)}, à la demande de ses auteurs.
          </p>
          {prereg.withdrawalReason && <p style={{ margin: '6px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>Motif : {prereg.withdrawalReason}</p>}
          <p style={{ margin: '8px 0 0', ...petit }}>
            Son contenu a été effacé. Ses liens restent actifs et affichent cet avis de retrait, avec la date du verrouillage d’origine ({dateLongue(prereg.lockedAt)}) et l’empreinte {empreinteCourte(prereg.fingerprint)}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            Préenregistrement
            <Tooltip text="Décrivez vos hypothèses, votre plan et vos analyses AVANT la collecte, puis verrouillez : MindCraft enregistre la date et l'heure, et le texte ne peut plus être modifié. Vous obtenez un PDF et des liens à donner aux revues (relecture anonyme) et à mettre dans l'article." />
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--gray-500)' }}>
            Modèle adapté d’OSF Preregistration
            <Tooltip text={`${modele.source?.fr || ''} Référence : ${modele.source?.reference || ''}`} />
            {' · '}
            {verrouille ? <strong style={{ color: '#0f766e' }}>Verrouillé</strong> : prereg ? 'Brouillon' : 'Non commencé'}
            {!verrouille && !lecture && etat === 'enregistrement' && ' · enregistrement…'}
            {!verrouille && !lecture && etat === 'enregistré' && ' · brouillon enregistré'}
          </p>
        </div>
        {prereg && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm" onClick={() => telecharger(`/api/studies/${studyId}/prereg/pdf`, `${nomPdf}.pdf`)}>
              {verrouille ? 'PDF' : 'Aperçu PDF'}
            </button>
            {verrouille && <button type="button" className="btn btn-sm" onClick={() => telecharger(`/api/studies/${studyId}/prereg/pdf?anonyme=1`, `${nomPdf}_anonyme.pdf`)}>PDF anonyme</button>}
          </div>
        )}
      </div>

      {/* ── Verrouillé : date, empreinte, liens ── */}
      {verrouille && (
        <div style={{ ...carte, borderColor: '#99f6e4', background: '#f0fdfa' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#0f766e', fontWeight: 600 }}>
            Verrouillé le {dateLongue(prereg.lockedAt)}{prereg.lockedByName ? ` par ${prereg.lockedByName}` : ''}. Le texte ne peut plus être modifié.
          </p>
          <p style={{ margin: '4px 0 0', ...petit }} title={prereg.fingerprint}>Empreinte du texte : {empreinteCourte(prereg.fingerprint)}</p>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                Lien pour relecture anonyme
                <Tooltip text="Sans les noms des auteurs : à donner à une revue pour une relecture en double aveugle. Toujours actif." />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <input className="form-input" style={{ flex: 1, minWidth: 240, fontSize: 12.5 }} readOnly value={prereg.links?.review || ''} aria-label="Lien pour relecture anonyme" />
                <button type="button" className="btn btn-sm" onClick={() => copier(prereg.links?.review)}>Copier</button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                Lien public
                <Tooltip text="Avec les noms des auteurs : à mettre dans l'article une fois publié. Désactivé par défaut ; seul le propriétaire peut l'activer ou le désactiver." />
                {data.canLock && <Toggle value={!!prereg.publicEnabled} onChange={basculerPublic} />}
                <span style={petit}>{prereg.publicEnabled ? 'activé' : 'désactivé'}</span>
              </div>
              {prereg.publicEnabled && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <input className="form-input" style={{ flex: 1, minWidth: 240, fontSize: 12.5 }} readOnly value={prereg.links?.public || ''} aria-label="Lien public" />
                  <button type="button" className="btn btn-sm" onClick={() => copier(prereg.links?.public)}>Copier</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Brouillon : langue, pré-remplissage, progression ── */}
      {!lecture && (
        <div style={carte}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              Langue du préenregistrement
              <select className="form-input" style={{ width: 130 }} value={language} onChange={(e) => { setLanguage(e.target.value); setSale(true) }}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
              <Tooltip text="Langue des titres du PDF et des textes pré-remplis. Rédigez vos réponses dans cette langue." />
            </label>
            <button type="button" className="btn btn-sm" onClick={preRemplir} disabled={!vides.length}>
              Pré-remplir depuis la conception{vides.length ? ` (${vides.length})` : ''}
            </button>
            <span style={{ ...petit, marginLeft: 'auto' }}>{remplies} / {aRemplir.length} questions remplies</span>
          </div>
          {data.nbSessions > 0 && (
            <p style={{ margin: '10px 0 0', fontSize: 13, color: '#92400e', background: '#fef3c7', borderRadius: 8, padding: '8px 12px' }}>
              {data.nbSessions} participant{data.nbSessions > 1 ? 's ont' : ' a'} déjà commencé l’étude. Un préenregistrement se fait normalement avant la collecte : précisez-le dans « Données existantes ».
            </p>
          )}
        </div>
      )}
      {!verrouille && !data.canWrite && (
        <div style={{ ...carte, ...petit, fontSize: 13 }}>Vous consultez ce brouillon en lecture seule : seuls le propriétaire et les éditeurs du projet peuvent le rédiger.</div>
      )}

      {/* ── Sections du modèle ── */}
      {modele.sections.map((s) => (
        <div key={s.cle} style={carte}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15.5 }}>{s.fr} <span style={{ ...petit, fontWeight: 400, fontStyle: 'italic' }}>· {s.en}</span></h3>
          {s.questions.map((q) => {
            const prop = suggestions[q.cle]
            const libProp = prop && (q.type === 'choix' ? q.options.find((o) => o.valeur === prop)?.fr : prop)
            const vide = estVide(q, answers[q.cle], authors)
            const montrerProp = !lecture && libProp && answers[q.cle] !== prop && (ouvertes[q.cle] ?? vide)
            return (
              <div key={q.cle} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{q.fr}{q.obligatoire && !lecture && <span style={{ color: 'var(--red)' }}> *</span>}</span>
                  <span style={{ ...petit, fontStyle: 'italic' }}>{q.en}</span>
                  {!lecture && libProp && answers[q.cle] !== prop && !montrerProp && (
                    <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => setOuvertes((o) => ({ ...o, [q.cle]: true }))}>Proposition MindCraft</button>
                  )}
                </div>
                {q.aide && !lecture && <p style={{ margin: '2px 0 6px', ...petit }}>{q.aide}</p>}
                <div style={{ marginTop: lecture ? 4 : 0 }}>
                  {q.type === 'auteurs'
                    ? <Auteurs auteurs={authors} onChange={(v) => { setAuthors(v); setSale(true) }} lecture={lecture} />
                    : <Champ q={q} valeur={answers[q.cle]} onChange={(v) => modifier(q.cle, v)} lecture={lecture} />}
                </div>
                {montrerProp && (
                  <div style={{ marginTop: 6, background: 'var(--blue-pale, #eff6ff)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#1d4ed8' }}>Proposition de MindCraft, d’après la conception de l’étude</span>
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-sm" onClick={() => { modifier(q.cle, prop); setOuvertes((o) => ({ ...o, [q.cle]: false })) }}>{vide ? 'Utiliser' : 'Remplacer'}</button>
                        <button type="button" className="btn btn-sm" onClick={() => setOuvertes((o) => ({ ...o, [q.cle]: false }))}>Masquer</button>
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', color: 'var(--gray-700)' }}>{libProp}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* ── Verrouiller ── */}
      {!verrouille && data.canWrite && (
        <div style={{ ...carte, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, color: 'var(--gray-600)' }}>
            {data.canLock
              ? 'Quand le texte est prêt, verrouillez-le, de préférence avant le premier participant.'
              : 'Seul le propriétaire de l’étude peut verrouiller le préenregistrement.'}
          </span>
          {data.canLock && <button type="button" className="btn btn-primary" onClick={() => setVerrouOuvert(true)} disabled={!prereg && !sale}>Verrouiller…</button>}
        </div>
      )}

      {/* ── Amendements ── */}
      {verrouille && <Amendements prereg={prereg} canWrite={!!data.canWrite} studyId={studyId} onAjout={() => { queryClient.invalidateQueries({ queryKey: cle }); queryClient.invalidateQueries({ queryKey: ['notebook', studyId] }) }} />}

      {verrouOuvert && (
        <FenetreVerrouillage manquantsCourants={manquantsCourants} nbSessions={data.nbSessions} envoi={envoi} onAnnuler={() => setVerrouOuvert(false)} onVerrouiller={verrouiller} />
      )}
    </div>
  )
}

function Amendements({ prereg, canWrite, studyId, onAjout }) {
  const [category, setCategory] = useState('PRECISION')
  const [content, setContent] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const liste = prereg.amendments || []

  const ajouter = async () => {
    if (!content.trim()) { toast.error('Écrivez le texte de l’amendement.'); return }
    setEnvoi(true)
    try {
      await api.post(`/api/studies/${studyId}/prereg/amendments`, { category, content })
      setContent('')
      onAjout()
      toast.success('Amendement ajouté')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'L’amendement n’a pas pu être ajouté.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div style={carte}>
      <h3 style={{ margin: '0 0 4px', fontSize: 15.5 }}>
        Amendements
        <Tooltip text="Le texte verrouillé ne change jamais. Un amendement le complète : il est daté, définitif, et figure dans le PDF et sur les liens de consultation." />
      </h3>
      <p style={{ margin: '0 0 12px', ...petit }}>{liste.length ? `${liste.length} amendement${liste.length > 1 ? 's' : ''}` : 'Aucun amendement.'}</p>
      {liste.map((a) => (
        <div key={a.id} style={{ borderLeft: '3px solid var(--gray-300)', padding: '4px 0 4px 12px', marginBottom: 10 }}>
          <div style={petit}>{dateLongue(a.createdAt)} · <strong>{libCategorie(a.category)}</strong>{a.authorName ? ` · ${a.authorName}` : ''}</div>
          <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{a.content}</p>
        </div>
      ))}
      {canWrite && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--gray-100)', paddingTop: 12 }}>
          <select className="form-input" style={{ width: 170, marginBottom: 6 }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie de l'amendement">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <p style={{ margin: '0 0 6px', ...petit }}>{CATEGORIES.find((c) => c.value === category)?.aide}</p>
          <textarea className="form-input" rows={3} style={{ width: '100%', resize: 'vertical' }} value={content} maxLength={5000} onChange={(e) => setContent(e.target.value)} placeholder="Ce qui change, et pourquoi." aria-label="Texte de l'amendement" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Une fois ajouté, l’amendement ne pourra plus être modifié.</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={ajouter} disabled={envoi}>{envoi ? 'Ajout…' : 'Ajouter l’amendement'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
