import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { confirmDelete } from '../../lib/confirm'
import { Tooltip } from './FormWidgets'

// Écarts au préenregistrement (préenregistrement verrouillé). MindCraft
// détecte ce qu'il peut comparer (conditions, mesures, effectif, matériel,
// amendements, écarts notés dans le cahier) et propose catégorie et moment ;
// le chercheur confirme ou corrige, écrit la raison et l'impact, et déclare
// à la main ce que MindCraft ne peut pas voir (analyses, hypothèses).
// Tableau exportable en ODT (à joindre à l'article) ou CSV.

const CATEGORIES = [
  { value: 'MAJEUR', label: 'Majeur', bg: '#fee2e2', fg: '#991b1b' },
  { value: 'MINEUR', label: 'Mineur', bg: '#fef3c7', fg: '#92400e' },
  { value: 'PRECISION', label: 'Précision', bg: 'var(--blue-pale, #eff6ff)', fg: '#1d4ed8' },
  { value: 'SANS_OBJET', label: 'Sans objet', bg: 'var(--gray-100)', fg: 'var(--gray-600)' },
]
const cat = (v) => CATEGORIES.find((c) => c.value === v) || CATEGORIES[3]
const dateFr = (d) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
const carte = { background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }
const petit = { fontSize: 12.5, color: 'var(--gray-500)' }
const AIDES = {
  moment: 'Quand l’écart a eu lieu, par rapport à la collecte et à l’accès aux données. Proposé par MindCraft d’après les dates ; corrigez-le si besoin.',
  raison: 'Pourquoi cet écart.',
  impact: 'Ce que cet écart change pour l’interprétation des résultats.',
}

async function telecharger(url, nomParDefaut) {
  try {
    const res = await api.get(url, { responseType: 'blob' })
    const nom = /filename="([^"]+)"/.exec(res.headers?.['content-disposition'] || '')?.[1] || nomParDefaut
    const lien = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = lien; a.download = nom
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(lien)
  } catch {
    toast.error('Export impossible.')
  }
}

function Champs({ valeurs, onChange, lecture, avecDescription }) {
  const champ = (cle, libelle, lignes, aide) => (
    <label style={{ display: 'block', marginTop: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{libelle}{aide && <Tooltip text={aide} />}</span>
      {lecture
        ? <p style={{ margin: '2px 0 0', fontSize: 13.5, whiteSpace: 'pre-wrap', color: valeurs[cle] ? 'inherit' : 'var(--gray-400)' }}>{valeurs[cle] || '—'}</p>
        : lignes === 1
          ? <input className="form-input" style={{ width: '100%', marginTop: 2 }} value={valeurs[cle] || ''} maxLength={5000} onChange={(e) => onChange(cle, e.target.value)} aria-label={libelle} />
          : <textarea className="form-input" rows={lignes} style={{ width: '100%', marginTop: 2, resize: 'vertical' }} value={valeurs[cle] || ''} maxLength={5000} onChange={(e) => onChange(cle, e.target.value)} aria-label={libelle} />}
    </label>
  )
  return (
    <>
      {avecDescription && champ('description', 'Écart', 2)}
      {champ('moment', 'Moment', 1, AIDES.moment)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 12px' }}>
        {champ('raison', 'Raison', 2, AIDES.raison)}
        {champ('impact', 'Impact', 2, AIDES.impact)}
      </div>
    </>
  )
}

function SelectCategorie({ value, onChange, lecture }) {
  const c = cat(value)
  if (lecture) return <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: c.bg, color: c.fg }}>{c.label}</span>
  return (
    <select className="form-input" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Catégorie"
      style={{ width: 140, fontWeight: 700, background: c.bg, color: c.fg, borderColor: 'transparent' }}>
      {CATEGORIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
    </select>
  )
}

function Ligne({ ligne, numero, canWrite, studyId, onEnregistre }) {
  const initial = { categorie: ligne.categorie, description: ligne.description, moment: ligne.moment, raison: ligne.raison, impact: ligne.impact }
  const [v, setV] = useState(initial)
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => { setV(initial) }, [ligne.modifieLe, ligne.categorie, ligne.moment]) // eslint-disable-line react-hooks/exhaustive-deps
  const sale = JSON.stringify(v) !== JSON.stringify(initial)
  const maj = (cle, val) => setV((x) => ({ ...x, [cle]: val }))

  const enregistrer = async () => {
    setEnvoi(true)
    try {
      const corps = { category: v.categorie, moment: v.moment, reason: v.raison, impact: v.impact }
      if (ligne.detecte) await api.put(`/api/studies/${studyId}/prereg/deviations/detected`, { ...corps, key: ligne.key })
      else await api.put(`/api/studies/${studyId}/prereg/deviations/${ligne.id}`, { ...corps, description: v.description })
      await onEnregistre()
      toast.success('Écart enregistré')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Enregistrement impossible.')
    } finally {
      setEnvoi(false)
    }
  }

  const supprimer = async () => {
    if (!(await confirmDelete({ what: 'cet écart déclaré', detail: 'Il disparaîtra du tableau des écarts.' }))) return
    try {
      await api.delete(`/api/studies/${studyId}/prereg/deviations/${ligne.id}`)
      await onEnregistre()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Suppression impossible.')
    }
  }

  return (
    <div style={{ border: '1px solid var(--gray-200)', borderLeft: `4px solid ${cat(v.categorie).fg}`, borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13 }}>{numero}.</strong>
        <SelectCategorie value={v.categorie} onChange={(c) => maj('categorie', c)} lecture={!canWrite} />
        <span style={petit}>{ligne.detecte ? 'Détecté par MindCraft' : 'Déclaré'}</span>
        {ligne.detecte && ligne.categorieProposee && v.categorie !== ligne.categorieProposee && (
          <span style={petit}>(proposé : {cat(ligne.categorieProposee).label})</span>
        )}
        {ligne.modifieLe && <span style={{ ...petit, marginLeft: 'auto' }}>Complété le {dateFr(ligne.modifieLe)}{ligne.modifiePar ? ` par ${ligne.modifiePar}` : ''}</span>}
      </div>
      {ligne.detecte && <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5 }}>{ligne.description}</p>}
      <Champs valeurs={v} onChange={maj} lecture={!canWrite} avecDescription={!ligne.detecte} />
      {canWrite && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
          {ligne.detecte && ligne.momentPropose && v.moment !== ligne.momentPropose && (
            <button type="button" className="btn btn-sm" onClick={() => maj('moment', ligne.momentPropose)}>Moment proposé</button>
          )}
          {!ligne.detecte && <button type="button" className="btn btn-sm" onClick={supprimer}>Supprimer</button>}
          <button type="button" className="btn btn-primary btn-sm" disabled={!sale || envoi} onClick={enregistrer}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      )}
    </div>
  )
}

function NouvelEcart({ studyId, onAjout }) {
  const vide = { categorie: 'MAJEUR', description: '', moment: '', raison: '', impact: '' }
  const [ouvert, setOuvert] = useState(false)
  const [v, setV] = useState(vide)
  const [envoi, setEnvoi] = useState(false)
  if (!ouvert) return <button type="button" className="btn btn-sm" onClick={() => setOuvert(true)}>+ Déclarer un écart</button>

  const ajouter = async () => {
    setEnvoi(true)
    try {
      await api.post(`/api/studies/${studyId}/prereg/deviations`, { category: v.categorie, description: v.description, moment: v.moment, reason: v.raison, impact: v.impact })
      setV(vide); setOuvert(false)
      await onAjout()
      toast.success('Écart ajouté')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Ajout impossible.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div style={{ border: '1px dashed var(--gray-300)', borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <strong style={{ fontSize: 13.5 }}>Déclarer un écart</strong>
        <SelectCategorie value={v.categorie} onChange={(c) => setV((x) => ({ ...x, categorie: c }))} />
      </div>
      <p style={{ margin: '6px 0 0', ...petit }}>Pour ce que MindCraft ne peut pas voir : analyse différente de celle prévue, hypothèse reformulée, critère d’exclusion modifié…</p>
      <Champs valeurs={v} onChange={(cle, val) => setV((x) => ({ ...x, [cle]: val }))} avecDescription />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
        <button type="button" className="btn btn-sm" onClick={() => { setV(vide); setOuvert(false) }}>Annuler</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={envoi} onClick={ajouter}>{envoi ? 'Ajout…' : 'Ajouter'}</button>
      </div>
    </div>
  )
}

export default function EcartsPrereg({ studyId }) {
  const queryClient = useQueryClient()
  const cle = ['prereg-ecarts', studyId]
  const { data, isLoading, error } = useQuery({
    queryKey: cle,
    queryFn: async () => (await api.get(`/api/studies/${studyId}/prereg/deviations`)).data,
    enabled: !!studyId,
  })
  const recharger = () => queryClient.invalidateQueries({ queryKey: cle })

  if (isLoading) return <div style={carte}><p style={{ margin: 0, color: 'var(--gray-400)' }}>Chargement des écarts…</p></div>
  if (error || !data) return null

  const { lignes, resume, contexte, canWrite } = data
  return (
    <div style={carte}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15.5 }}>
            Écarts au préenregistrement
            <Tooltip text="MindCraft compare l'étude au préenregistrement verrouillé et repère ce qu'il peut voir : conditions, mesures, effectif, matériel, amendements, écarts notés dans le cahier de labo. Pour chaque écart, vérifiez la catégorie et le moment, puis écrivez la raison et l'impact. Déclarez vous-même les autres écarts (analyses, hypothèses). Le tableau s'exporte pour l'article." />
          </h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {CATEGORIES.map((c) => (
              <span key={c.value} style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: c.bg, color: c.fg }}>{c.label} : {resume[c.value] || 0}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-sm" onClick={() => telecharger(`/api/studies/${studyId}/prereg/deviations/export?format=odt`, 'ecarts.odt')}>Exporter (ODT)</button>
          <button type="button" className="btn btn-sm" onClick={() => telecharger(`/api/studies/${studyId}/prereg/deviations/export?format=csv`, 'ecarts.csv')}>CSV</button>
        </div>
      </div>

      <p style={{ margin: '10px 0 12px', ...petit }}>
        {contexte.collecteEnCours
          ? 'Collecte en cours : le tableau se complète au fil de l’étude ; l’écart d’effectif apparaîtra à la fin de la collecte.'
          : `Collecte terminée : ${contexte.termines} participant${contexte.termines > 1 ? 's' : ''} ayant terminé${contexte.objectifPrevu ? ` (prévu : ${contexte.objectifPrevu})` : ''}.`}
        {' '}
        {contexte.premierExport ? `Premier export des données après le verrouillage : ${dateFr(contexte.premierExport)}.` : 'Aucun export des données depuis le verrouillage.'}
      </p>

      {lignes.length === 0 && <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gray-500)' }}>Aucun écart détecté ni déclaré pour l’instant.</p>}
      {lignes.map((l, i) => (
        <Ligne key={l.key || l.id} ligne={l} numero={i + 1} canWrite={canWrite} studyId={studyId} onEnregistre={recharger} />
      ))}
      {canWrite && <NouvelEcart studyId={studyId} onAjout={recharger} />}
    </div>
  )
}
