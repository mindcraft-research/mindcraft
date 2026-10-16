import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { Tooltip } from './FormWidgets'

// Cahier de laboratoire de l'étude. Entrées datées et signées, jamais
// modifiées ni supprimées : une erreur se rectifie par une correction qui
// cite l'entrée d'origine. Les entrées automatiques sont ajoutées par
// MindCraft (statut, modifications pendant la collecte, réinitialisation,
// objectif / délai d'abandon, gel du matériel, préenregistrement verrouillé
// et amendements).

const TYPES = [
  { value: 'PASSATION', label: 'Passation', bg: 'var(--blue-pale, #eff6ff)', fg: '#1d4ed8', aide: 'Déroulé d’une séance : groupe, lieu, nombre de participants, ce qui s’est passé.' },
  { value: 'ECART', label: 'Écart', bg: '#fef3c7', fg: '#92400e', aide: 'Écart au protocole ou au préenregistrement, et sa raison. Noté après le verrouillage du préenregistrement, il apparaît aussi dans le tableau des écarts (onglet Préenregistrement).' },
  { value: 'DECISION', label: 'Décision', bg: '#ede9fe', fg: '#5b21b6', aide: 'Décision prise en cours d’étude : prolonger la collecte, exclure un participant…' },
  { value: 'INCIDENT', label: 'Incident', bg: '#fee2e2', fg: '#991b1b', aide: 'Problème rencontré : bug, coupure, consigne mal comprise…' },
  { value: 'NOTE', label: 'Note', bg: 'var(--gray-100)', fg: 'var(--gray-700)', aide: 'Toute autre remarque utile.' },
]
const AUTO = { label: 'Automatique', bg: 'var(--gray-100)', fg: 'var(--gray-600)' }
const typeDe = (kind) => TYPES.find((t) => t.value === kind) || AUTO
const dateFr = (d) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

// prefixe : « Correction » (cite une entrée manuelle) ou « Commentaire »
// (cite une entrée automatique), sinon rien.
function Badge({ kind, prefixe }) {
  const t = typeDe(kind)
  return (
    <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: t.bg, color: t.fg, whiteSpace: 'nowrap' }}>
      {prefixe ? `${prefixe} · ${t.label}` : t.label}
    </span>
  )
}

export default function NotebookPanel({ studyId, studyName }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['notebook', studyId],
    queryFn: async () => (await api.get(`/api/studies/${studyId}/notebook`)).data,
    enabled: !!studyId,
  })
  const entries = data?.entries || []
  const canWrite = !!data?.canWrite

  const [kind, setKind] = useState('PASSATION')
  const [content, setContent] = useState('')
  const [participants, setParticipants] = useState('')
  const [corrige, setCorrige] = useState(null) // entrée en cours de correction
  const [filtre, setFiltre] = useState('TOUS')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const parId = Object.fromEntries(entries.map((e) => [e.id, e]))
  const corrections = (id) => entries.filter((e) => e.correctsId === id)

  const commencerCorrection = (e) => {
    setCorrige(e)
    setKind(e.kind === 'AUTO' ? 'NOTE' : e.kind)
    setContent('')
    setErreur('')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const ajouter = async () => {
    if (!content.trim()) { setErreur('Écrivez le texte de l’entrée.'); return }
    setEnvoi(true)
    try {
      await api.post(`/api/studies/${studyId}/notebook`, {
        kind, content, participantIds: participants, correctsId: corrige?.id || null,
      })
      setContent(''); setParticipants(''); setCorrige(null); setErreur('')
      queryClient.invalidateQueries({ queryKey: ['notebook', studyId] })
      toast.success(corrige ? 'Correction ajoutée' : 'Entrée ajoutée')
    } catch (err) {
      setErreur(err?.response?.data?.error || 'L’entrée n’a pas pu être enregistrée.')
    } finally {
      setEnvoi(false)
    }
  }

  const exporterPdf = async () => {
    try {
      const res = await api.get(`/api/studies/${studyId}/notebook/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `cahier_labo_${(studyName || studyId).replace(/[^\w]/g, '_')}.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Export impossible.')
    }
  }

  // Version figée au lancement de la collecte (entrée automatique GEL) :
  // codebook PDF ou structure JSON de cette version.
  const telechargerGel = async (refId, type) => {
    try {
      const res = await api.get(`/api/studies/${studyId}/freezes/${refId}/${type}`, { responseType: 'blob' })
      const dispo = res.headers?.['content-disposition'] || ''
      const nom = /filename="([^"]+)"/.exec(dispo)?.[1] || (type === 'codebook' ? 'codebook_fige.pdf' : 'structure_figee.json')
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url; a.download = nom
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Téléchargement impossible.')
    }
  }

  // Préenregistrement verrouillé (entrée automatique PREREG) : PDF complet,
  // amendements compris.
  const telechargerPrereg = async () => {
    try {
      const res = await api.get(`/api/studies/${studyId}/prereg/pdf`, { responseType: 'blob' })
      const nom = /filename="([^"]+)"/.exec(res.headers?.['content-disposition'] || '')?.[1] || 'preenregistrement.pdf'
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url; a.download = nom
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err?.response?.status === 410 ? 'Ce préenregistrement a été retiré : son contenu a été effacé.' : 'Téléchargement impossible.')
    }
  }

  // Plus récentes en haut à l'écran (le PDF reste chronologique).
  const visibles = [...entries].reverse().filter((e) => filtre === 'TOUS' || (filtre === 'AUTO' ? e.kind === 'AUTO' : e.kind === filtre))

  const carte = { background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            Cahier de laboratoire
            <Tooltip text="Consignez tout ce qui se passe pendant l'étude : passations, incidents, décisions, écarts au protocole. Chaque entrée est datée et signée. Elle ne peut ni être modifiée ni supprimée : en cas d'erreur, ajoutez une correction, qui la cite. MindCraft ajoute aussi des entrées automatiques (changement de statut, modification de l'étude pendant la collecte, réinitialisation des données, objectif ou délai d'abandon modifiés). Exportable en PDF pour l'article, le dépôt des données ou le comité d'éthique." />
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--gray-500)' }}>
            {entries.length} entrée{entries.length > 1 ? 's' : ''} · les entrées ne se modifient pas et ne se suppriment pas
          </p>
        </div>
        <button type="button" className="btn btn-sm" onClick={exporterPdf} disabled={entries.length === 0}>Exporter en PDF</button>
      </div>

      {canWrite ? (
        <div style={carte}>
          {corrige && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: '#fef3c7', color: '#92400e', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
              <span>
                {corrige.kind === 'AUTO'
                  ? `Commentaire de l’entrée automatique du ${dateFr(corrige.createdAt)} : votre entrée la citera.`
                  : `Correction de l’entrée du ${dateFr(corrige.createdAt)} : l’entrée d’origine reste visible, votre correction la citera.`}
              </span>
              <button type="button" className="btn btn-sm" onClick={() => setCorrige(null)}>Annuler</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <select className="form-input" style={{ width: 170 }} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type d'entrée">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              className="form-input" style={{ flex: 1, minWidth: 220 }}
              placeholder="Participants concernés (facultatif) : P12, P15"
              value={participants} onChange={(e) => setParticipants(e.target.value)}
              aria-label="Participants concernés"
            />
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 12.5, color: 'var(--gray-500)' }}>{typeDe(kind).aide}</p>
          <textarea
            className="form-input" rows={4} style={{ width: '100%', resize: 'vertical' }}
            placeholder="TD groupe 3, salle B12 : 26 étudiants, 2 arrivés en retard ont commencé après la consigne."
            value={content} onChange={(e) => { setContent(e.target.value); if (erreur) setErreur('') }}
            aria-label="Texte de l'entrée" maxLength={5000}
          />
          {erreur && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--red)' }}>{erreur}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Une fois ajoutée, l’entrée ne pourra plus être modifiée.</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={ajouter} disabled={envoi}>
              {envoi ? 'Enregistrement…' : corrige ? (corrige.kind === 'AUTO' ? 'Ajouter le commentaire' : 'Ajouter la correction') : 'Ajouter l’entrée'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ ...carte, fontSize: 13, color: 'var(--gray-500)' }}>Vous consultez ce cahier en lecture seule : seuls le propriétaire et les éditeurs du projet peuvent y écrire.</div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {[{ value: 'TOUS', label: 'Toutes' }, ...TYPES, { value: 'AUTO', label: 'Automatiques' }].map((t) => (
          <button
            key={t.value} type="button" className="btn btn-sm"
            onClick={() => setFiltre(t.value)}
            style={filtre === t.value ? { borderColor: 'var(--blue)', color: 'var(--blue)', background: 'var(--blue-pale, #eff6ff)' } : undefined}
          >{t.label}</button>
        ))}
      </div>

      {isLoading && <p style={{ color: 'var(--gray-400)' }}>Chargement…</p>}
      {!isLoading && visibles.length === 0 && (
        <div style={{ ...carte, textAlign: 'center', color: 'var(--gray-500)', fontSize: 14 }}>
          {entries.length === 0
            ? 'Aucune entrée pour l’instant. Notez le déroulé de votre première passation, ou toute décision prise sur l’étude.'
            : 'Aucune entrée de ce type.'}
        </div>
      )}

      {visibles.map((e) => {
        const corr = corrections(e.id)
        const pids = Array.isArray(e.participantIds) ? e.participantIds : []
        return (
          <div key={e.id} style={{ ...carte, padding: '12px 16px', borderLeft: e.kind === 'AUTO' ? '3px solid var(--gray-300)' : undefined, borderRadius: e.kind === 'AUTO' ? 0 : 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Badge kind={e.kind} prefixe={e.correctsId ? (parId[e.correctsId]?.kind === 'AUTO' ? 'Commentaire' : 'Correction') : null} />
              <span style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{dateFr(e.createdAt)} · {e.authorName || 'MindCraft'}</span>
              {canWrite && (
                <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => commencerCorrection(e)}>
                  {e.kind === 'AUTO' ? 'Commenter' : 'Corriger'}
                </button>
              )}
            </div>
            {e.correctsId && parId[e.correctsId] && (
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--gray-500)' }}>
                {parId[e.correctsId].kind === 'AUTO' ? 'Commente l’entrée automatique' : 'Corrige l’entrée'} du {dateFr(parId[e.correctsId].createdAt)}.
              </p>
            )}
            {corr.length > 0 && (
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#92400e' }}>
                {e.kind === 'AUTO' ? 'Commentée' : 'Corrigée'} le {corr.map((c) => dateFr(c.createdAt)).join(', ')}.
              </p>
            )}
            <p style={{ margin: '8px 0 0', fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{e.content}</p>
            {e.autoEvent === 'GEL' && e.refId && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-sm" onClick={() => telechargerGel(e.refId, 'codebook')}>Codebook figé (PDF)</button>
                <button type="button" className="btn btn-sm" onClick={() => telechargerGel(e.refId, 'structure')}>Structure figée (JSON)</button>
              </div>
            )}
            {e.autoEvent === 'PREREG' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-sm" onClick={() => telechargerPrereg()}>Préenregistrement (PDF)</button>
              </div>
            )}
            {pids.length > 0 && <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--gray-500)' }}>Participants : {pids.join(', ')}</p>}
          </div>
        )
      })}
    </div>
  )
}
