import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { modePrereg } from './EtapesEtude'
import styles from '../../pages/studies/builder.module.css'

// Onglet Open Science : métadonnées de l'étude et du jeu de données, pour le
// codebook, le README et le dépôt dans un entrepôt de données. Tous les
// champs sont facultatifs. MindCraft propose des valeurs quand il peut les
// déduire de l'étude (route /open-science/suggestions) : elles ne sont
// reprises que sur un clic, et restent modifiables.

export const LICENCES = [
  { value: 'CC-BY-4.0', label: 'CC-BY 4.0 (recommandée)', aide: 'Réutilisation libre, à condition de citer les auteurs. C’est la licence demandée par la plupart des financeurs.' },
  { value: 'Etalab-2.0', label: 'Licence Ouverte 2.0 (Etalab)', aide: 'Équivalent français de CC-BY, proposé notamment par Recherche Data Gouv.' },
  { value: 'CC0-1.0', label: 'CC0 (domaine public)', aide: 'Aucune condition, pas même la citation (qui reste d’usage en recherche).' },
  { value: 'CC-BY-SA-4.0', label: 'CC-BY-SA 4.0', aide: 'Comme CC-BY, et les données dérivées doivent être partagées sous la même licence.' },
  { value: 'CC-BY-NC-4.0', label: 'CC-BY-NC 4.0 (pas d’usage commercial)', aide: 'Réutilisation non commerciale seulement. Elle freine la réutilisation : à éviter sauf contrainte particulière.' },
  { value: 'autre', label: 'Autre…', aide: 'Précisez la licence.' },
]
export const ACCES = [
  { value: 'ouvert', label: 'Accès ouvert', aide: 'Tout le monde peut télécharger les fichiers.' },
  { value: 'embargo', label: 'Embargo jusqu’à une date', aide: 'La description est visible tout de suite ; les fichiers seront ouverts à la date indiquée (par exemple à la publication de l’article).' },
  { value: 'restreint', label: 'Accès sur demande', aide: 'Les fichiers ne sont transmis qu’à la demande, sous conditions (par exemple pour des données sensibles).' },
]

// Préenregistrement tel que renseigné dans l'onglet Préenregistrement
// (MindCraft, fait ailleurs ou absent) : affiché ici, modifié là-bas.
function etatPrereg(study, data) {
  const meta = study.metadata || {}
  const p = data?.prereg
  const mode = modePrereg(study)
  if (p?.withdrawnAt) return { texte: 'Retiré par un administrateur de MindCraft' }
  if (p?.status === 'LOCKED') {
    const date = new Date(p.lockedAt).toLocaleDateString('fr-FR')
    return p.publicEnabled
      ? { texte: `Sur MindCraft, verrouillé le ${date}`, url: p.links?.public }
      : { texte: `Sur MindCraft, verrouillé le ${date} · lien pour relecture anonyme (le lien public n’est pas activé)`, url: p.links?.review }
  }
  if (mode === 'aucun') return { texte: 'Pas de préenregistrement pour cette étude' }
  if (mode === 'ailleurs') return meta.preregistration
    ? { texte: 'Fait sur une autre plateforme', url: meta.preregistration }
    : { texte: 'Fait sur une autre plateforme · lien à indiquer' }
  if (!data) return { texte: '…' }
  return { texte: p ? 'Brouillon sur MindCraft, pas encore verrouillé' : 'Pas encore commencé' }
}

const CHAMPS = [
  'projectTitle', 'projectDescription', 'projectDoi', 'projectEthicsNumber',
  'datasetAuthors', 'contactName', 'contactEmail', 'discipline', 'dataLicense', 'dataLicenseOther',
  'accessType', 'embargoDate', 'accessConditions', 'collectionStart', 'collectionEnd', 'sampleSize',
  'population', 'anonymisation', 'funding', 'relatedPublication',
  'materialsUrl', 'dataUrl', 'studyEthicsNumber', 'keywords',
]
const vide = (v) => v == null || (Array.isArray(v) ? v.filter((a) => a?.name?.trim?.() || typeof a === 'string').length === 0 : String(v).trim() === '')
const pareil = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '')
const auteursTexte = (as) => (as || []).filter((a) => a?.name).map((a) => [a.name, a.affiliation && `(${a.affiliation})`, a.orcid && `ORCID ${a.orcid}`].filter(Boolean).join(' ')).join(' ; ')

export default function OpenSciencePanel({ study, onSave, onOuvrirPrereg }) {
  const meta = study.metadata || {}
  // Même requête (et même cache) que l'onglet Préenregistrement.
  const { data: dataPrereg } = useQuery({
    queryKey: ['prereg', study.id],
    queryFn: async () => (await api.get(`/api/studies/${study.id}/prereg`)).data,
    enabled: !!study.id,
  })
  const prereg = etatPrereg(study, dataPrereg)
  const [editing, setEditing] = useState(false)
  const { data: dataProp } = useQuery({
    queryKey: ['open-science-suggestions', study.id],
    queryFn: async () => (await api.get(`/api/studies/${study.id}/open-science/suggestions`)).data,
    enabled: !!study.id && editing,
  })
  const props = dataProp?.suggestions || {}
  const [form, setForm] = useState({})
  const [ouvertes, setOuvertes] = useState({}) // propositions affichées (champ déjà rempli)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  const open = () => {
    const f = {}
    for (const k of CHAMPS) f[k] = meta[k] ?? (k === 'keywords' || k === 'datasetAuthors' ? [] : '')
    if (!meta.projectTitle) f.projectTitle = study.project?.name || ''
    setForm(f)
    setOuvertes({})
    setTagInput('')
    setEditing(true)
  }

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const addTag = () => {
    const t = tagInput.trim()
    if (!t || form.keywords.includes(t)) return
    upd('keywords', [...form.keywords, t])
    setTagInput('')
  }
  const removeTag = (t) => upd('keywords', form.keywords.filter((k) => k !== t))

  const save = async () => {
    setSaving(true)
    try {
      const propre = { ...form, datasetAuthors: (form.datasetAuthors || []).filter((a) => a.name?.trim() || a.affiliation?.trim() || a.orcid?.trim()) }
      await onSave(propre)
      setEditing(false)
    } finally { setSaving(false) }
  }

  // Propositions applicables aux champs encore vides.
  const aProposer = Object.keys(props).filter((k) => !vide(props[k]) && vide(form[k]))
  const toutReprendre = () => setForm((f) => {
    const n = { ...f }
    for (const k of aProposer) n[k] = props[k]
    return n
  })

  const hasData = CHAMPS.some((k) => !vide(meta[k]))

  // Proposition de MindCraft sous un champ : affichée d'office si le champ
  // est vide, sur demande sinon.
  const proposition = (k, libelle) => {
    const p = props[k]
    if (vide(p) || pareil(p, form[k])) return null
    const texte = libelle ? libelle(p) : p
    if (!vide(form[k]) && !ouvertes[k]) {
      return <button type="button" className={styles.osInlineLink} style={{ fontSize: 12, marginTop: 4 }} onClick={() => setOuvertes((o) => ({ ...o, [k]: true }))}>Voir la proposition de MindCraft</button>
    }
    return (
      <div className={styles.osProp}>
        <span className={styles.osPropTexte}><strong>Proposition de MindCraft :</strong> {texte}</span>
        <span className={styles.osPropActions}>
          <button type="button" className="btn btn-sm" onClick={() => { upd(k, p); setOuvertes((o) => ({ ...o, [k]: false })) }}>{vide(form[k]) ? 'Utiliser' : 'Remplacer'}</button>
          {!vide(form[k]) && <button type="button" className="btn btn-sm" onClick={() => setOuvertes((o) => ({ ...o, [k]: false }))}>Masquer</button>}
        </span>
      </div>
    )
  }

  // Proposition qui remplit plusieurs champs d'un coup (contact, période).
  const propositionGroupe = (id, ks, texte) => {
    const utiles = ks.filter((k) => !vide(props[k]) && !pareil(props[k], form[k]))
    if (!utiles.length) return null
    const rempli = utiles.some((k) => !vide(form[k]))
    if (rempli && !ouvertes[id]) {
      return <button type="button" className={styles.osInlineLink} style={{ fontSize: 12, marginTop: 4 }} onClick={() => setOuvertes((o) => ({ ...o, [id]: true }))}>Voir la proposition de MindCraft</button>
    }
    const appliquer = () => {
      setForm((f) => { const n = { ...f }; for (const k of utiles) n[k] = props[k]; return n })
      setOuvertes((o) => ({ ...o, [id]: false }))
    }
    return (
      <div className={styles.osProp}>
        <span className={styles.osPropTexte}><strong>Proposition de MindCraft :</strong> {texte()}</span>
        <span className={styles.osPropActions}>
          <button type="button" className="btn btn-sm" onClick={appliquer}>{rempli ? 'Remplacer' : 'Utiliser'}</button>
          {rempli && <button type="button" className="btn btn-sm" onClick={() => setOuvertes((o) => ({ ...o, [id]: false }))}>Masquer</button>}
        </span>
      </div>
    )
  }

  /* ── Champs du formulaire (rendus en ligne, pas en sous-composants, pour ne pas perdre le focus) ── */
  const champ = (k, label, { aide, placeholder, textarea, type, libelleProp } = {}) => (
    <div className={styles.osFieldRow} key={k}>
      <label className={styles.osFieldLabel} htmlFor={`os-${k}`}>{label}</label>
      {aide && <p className={styles.osHelp}>{aide}</p>}
      {textarea
        ? <textarea id={`os-${k}`} className={styles.osFieldInput} style={{ resize: 'vertical', minHeight: 64 }} value={form[k] || ''} onChange={(e) => upd(k, e.target.value)} placeholder={placeholder} />
        : <input id={`os-${k}`} type={type || 'text'} className={styles.osFieldInput} value={form[k] || ''} onChange={(e) => upd(k, e.target.value)} placeholder={placeholder} />}
      {proposition(k, libelleProp)}
    </div>
  )

  const choix = (k, label, options, aide) => {
    const sel = options.find((o) => o.value === form[k])
    return (
      <div className={styles.osFieldRow} key={k}>
        <label className={styles.osFieldLabel} htmlFor={`os-${k}`}>{label}</label>
        {aide && <p className={styles.osHelp}>{aide}</p>}
        <select id={`os-${k}`} className={styles.osFieldInput} value={form[k] || ''} onChange={(e) => upd(k, e.target.value)}>
          <option value="">— Choisir —</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {sel?.aide && <p className={styles.osHelp} style={{ marginTop: 4 }}>{sel.aide}</p>}
        {proposition(k, (v) => options.find((o) => o.value === v)?.label || v)}
      </div>
    )
  }

  const auteurs = form.datasetAuthors || []
  const majAuteur = (i, cle, v) => upd('datasetAuthors', auteurs.map((a, j) => (j === i ? { ...a, [cle]: v } : a)))

  /* ── Vue ── */
  const TextRow = ({ label, value }) => (vide(value) ? null : (
    <div className={styles.osRow}>
      <span className={styles.osLabel}>{label}</span>
      <span className={styles.osText} style={{ whiteSpace: 'pre-wrap' }}>{value}</span>
    </div>
  ))
  const LinkRow = ({ label, url }) => (url ? (
    <div className={styles.osRow}>
      <span className={styles.osLabel}>{label}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className={styles.osLink}>{url.length > 60 ? url.slice(0, 60) + '…' : url}</a>
    </div>
  ) : null)
  const licence = meta.dataLicense === 'autre' ? meta.dataLicenseOther : LICENCES.find((l) => l.value === meta.dataLicense)?.label?.replace(' (recommandée)', '')
  const acces = meta.accessType === 'embargo'
    ? `Embargo jusqu’au ${meta.embargoDate ? new Date(meta.embargoDate).toLocaleDateString('fr-FR') : '…'}`
    : meta.accessType === 'restreint' ? `Accès sur demande${meta.accessConditions ? ` : ${meta.accessConditions}` : ''}` : ACCES.find((a) => a.value === meta.accessType)?.label
  const periode = meta.collectionStart || meta.collectionEnd
    ? `${meta.collectionStart ? new Date(meta.collectionStart).toLocaleDateString('fr-FR') : '…'} – ${meta.collectionEnd ? new Date(meta.collectionEnd).toLocaleDateString('fr-FR') : 'en cours'}`
    : ''
  const contact = [meta.contactName, meta.contactEmail && `<${meta.contactEmail}>`].filter(Boolean).join(' ')
  const aJeu = ['datasetAuthors', 'contactName', 'contactEmail', 'discipline', 'dataLicense', 'accessType', 'collectionStart', 'collectionEnd', 'sampleSize', 'population', 'anonymisation', 'funding', 'relatedPublication'].some((k) => !vide(meta[k]))

  return (
    <div className={styles.osPanelWrap}>
      <div className={styles.osPanelHeader}>
        <div>
          <h2 className={styles.osPanelTitle}>🔬 Open Science</h2>
          <p className={styles.osPanelDesc}>
            Décrivez l’étude et ses données : ces informations figurent dans le codebook et servent à préparer le dépôt dans un entrepôt de données (README, auteurs, licence…).
          </p>
        </div>
        {!editing && (
          <button className="btn btn-primary btn-sm" onClick={open}>
            {hasData ? 'Modifier' : 'Ajouter des métadonnées'}
          </button>
        )}
      </div>

      <div className={styles.osGroup} style={{ marginBottom: 16 }}>
        <div className={styles.osRow}>
          <span className={styles.osLabel}>Préenregistrement</span>
          <span className={styles.osText}>
            {prereg.texte}
            {prereg.url && <> · <a href={prereg.url} target="_blank" rel="noopener noreferrer" className={styles.osLink}>{prereg.url.length > 60 ? prereg.url.slice(0, 60) + '…' : prereg.url}</a></>}
            {' · '}<button type="button" className={styles.osInlineLink} onClick={onOuvrirPrereg}>modifier dans l’onglet Préenregistrement</button>
          </span>
        </div>
      </div>

      {/* ── Vue ── */}
      {!editing && !hasData && (
        <div className={styles.osEmpty}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.2">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <p>Aucune métadonnée renseignée.</p>
          <p style={{ fontSize: '12px' }}>Ajoutez le projet, les auteurs, la licence, la période de collecte… MindCraft propose ce qu’il peut déduire de l’étude.</p>
        </div>
      )}

      {!editing && hasData && (
        <div className={styles.osDataGrid}>
          {(meta.projectTitle || meta.projectDescription || meta.projectDoi || meta.projectEthicsNumber) && (
            <div className={styles.osGroup}>
              <span className={styles.osGroupLabel}>Projet</span>
              <TextRow label="Titre du projet" value={meta.projectTitle} />
              <TextRow label="Description du projet" value={meta.projectDescription} />
              <LinkRow label="DOI du projet" url={meta.projectDoi} />
              <TextRow label="N° d'avis éthique (CER / CPP)" value={meta.projectEthicsNumber} />
            </div>
          )}
          {aJeu && (
            <div className={styles.osGroup}>
              <span className={styles.osGroupLabel}>Jeu de données</span>
              <TextRow label="Auteurs" value={auteursTexte(meta.datasetAuthors)} />
              <TextRow label="Contact" value={contact} />
              <TextRow label="Discipline" value={meta.discipline} />
              <TextRow label="Licence" value={licence} />
              <TextRow label="Accès" value={acces} />
              <TextRow label="Période de collecte" value={periode} />
              <TextRow label="Participants" value={meta.sampleSize} />
              <TextRow label="Population et recrutement" value={meta.population} />
              <TextRow label="Anonymisation" value={meta.anonymisation} />
              <TextRow label="Financement" value={meta.funding} />
              <TextRow label="Publication associée" value={meta.relatedPublication} />
            </div>
          )}
          {(meta.materialsUrl || meta.dataUrl || meta.studyEthicsNumber) && (
            <div className={styles.osGroup}>
              <span className={styles.osGroupLabel}>Liens et éthique</span>
              <LinkRow label="Matériel en ligne" url={meta.materialsUrl} />
              <LinkRow label="Données en ligne" url={meta.dataUrl} />
              <TextRow label="N° d'avis éthique (si différent du projet)" value={meta.studyEthicsNumber} />
            </div>
          )}
          {meta.keywords?.length > 0 && (
            <div className={styles.osRow}>
              <span className={styles.osLabel}>Mots-clés</span>
              <div className={styles.osTags}>
                {meta.keywords.map((k) => <span key={k} className={styles.osTag}>{k}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Formulaire ── */}
      {editing && (
        <div className={styles.osFormPanel}>
          <div className={styles.osIntro}>
            <span>Tous les champs sont facultatifs. Quand MindCraft peut déduire une valeur de l’étude, il la propose sous le champ : cliquez sur « Utiliser » pour la reprendre, puis modifiez-la si besoin.</span>
            {aProposer.length > 0 && (
              <button type="button" className="btn btn-sm" onClick={toutReprendre}>Utiliser les propositions dans les champs vides ({aProposer.length})</button>
            )}
          </div>

          <div className={styles.osFormGroup}>
            <span className={styles.osFormGroupTitle}>Projet de recherche</span>
            {champ('projectTitle', 'Titre du projet', { aide: 'Le projet global auquel l’étude appartient (plusieurs études peuvent partager un projet).', placeholder: study.project?.name || 'Nom du projet de recherche' })}
            {champ('projectDescription', 'Description du projet', { placeholder: 'Résumé du projet global…', textarea: true })}
            {champ('projectDoi', 'DOI du projet', { aide: 'Seulement si le projet a déjà un dépôt dans un entrepôt de données.', placeholder: 'https://doi.org/10.57745/…' })}
            {champ('projectEthicsNumber', "N° d'avis éthique (CER / CPP)", { placeholder: 'Ex. CER-2024-001 ou CPP 24.XX.XX.XXXXX' })}
          </div>

          <div className={styles.osFormGroup}>
            <span className={styles.osFormGroupTitle}>Jeu de données</span>
            <p className={styles.osHelp} style={{ marginTop: -4 }}>Ce que les entrepôts (Recherche Data Gouv, Nakala, Zenodo) demandent au dépôt, et ce qui permet à un autre chercheur de comprendre et de réutiliser vos données. Le titre et la description sont ceux de l’étude.</p>

            <div className={styles.osFieldRow}>
              <span className={styles.osFieldLabel}>Auteurs</span>
              <p className={styles.osHelp}>Les personnes à créditer pour ce jeu de données, dans l’ordre de citation. L’ORCID est l’identifiant chercheur (orcid.org), de la forme 0000-0002-1825-0097.</p>
              {auteurs.map((a, i) => (
                <div key={i} className={styles.osAuthorRow}>
                  <input className={styles.osFieldInput} value={a.name || ''} onChange={(e) => majAuteur(i, 'name', e.target.value)} placeholder="Nom et prénom" aria-label={`Auteur ${i + 1} : nom`} />
                  <input className={styles.osFieldInput} value={a.affiliation || ''} onChange={(e) => majAuteur(i, 'affiliation', e.target.value)} placeholder="Affiliation" aria-label={`Auteur ${i + 1} : affiliation`} />
                  <input className={styles.osFieldInput} value={a.orcid || ''} onChange={(e) => majAuteur(i, 'orcid', e.target.value)} placeholder="ORCID (facultatif)" aria-label={`Auteur ${i + 1} : ORCID`} />
                  <button type="button" className="btn btn-sm" onClick={() => upd('datasetAuthors', auteurs.filter((_, j) => j !== i))} aria-label={`Retirer l’auteur ${i + 1}`}>✕</button>
                </div>
              ))}
              <div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => upd('datasetAuthors', [...auteurs, { name: '', affiliation: '', orcid: '' }])}>+ Ajouter un auteur</button>
              </div>
              {proposition('datasetAuthors', auteursTexte)}
            </div>

            <div className={styles.osFieldRow}>
              <span className={styles.osFieldLabel}>Contact</span>
              <p className={styles.osHelp}>La personne à contacter pour toute question sur les données. Demandé par Recherche Data Gouv.</p>
              <div className={styles.osAuthorRow}>
                <input className={styles.osFieldInput} value={form.contactName || ''} onChange={(e) => upd('contactName', e.target.value)} placeholder="Nom" aria-label="Contact : nom" />
                <input className={styles.osFieldInput} type="email" value={form.contactEmail || ''} onChange={(e) => upd('contactEmail', e.target.value)} placeholder="E-mail" aria-label="Contact : e-mail" />
              </div>
              {propositionGroupe('contact', ['contactName', 'contactEmail'], () => [props.contactName, props.contactEmail].filter(Boolean).join(' · '))}
            </div>

            {champ('discipline', 'Discipline', { aide: 'En toutes lettres (ex. Psychologie sociale). Elle aide à retrouver le jeu de données.', libelleProp: (v) => `${v} (d’après votre profil)` })}
            {choix('dataLicense', 'Licence des données', LICENCES, 'Elle dit ce que les autres ont le droit de faire de vos données. Sans licence, personne ne peut légalement les réutiliser.')}
            {form.dataLicense === 'autre' && champ('dataLicenseOther', 'Licence (précisez)', { placeholder: 'Nom de la licence' })}
            {choix('accessType', 'Accès aux fichiers', ACCES, 'Vous le choisirez aussi au moment du dépôt, sur l’entrepôt.')}
            {form.accessType === 'embargo' && champ('embargoDate', 'Fin de l’embargo', { type: 'date' })}
            {form.accessType === 'restreint' && champ('accessConditions', 'Conditions d’accès', { placeholder: 'Ex. sur demande motivée auprès du contact, pour un usage de recherche', textarea: true })}

            <div className={styles.osFieldRow}>
              <span className={styles.osFieldLabel}>Période de collecte</span>
              <p className={styles.osHelp}>Du premier au dernier participant. Laissez la fin vide si la collecte continue.</p>
              <div className={styles.osAuthorRow}>
                <input type="date" className={styles.osFieldInput} value={form.collectionStart || ''} onChange={(e) => upd('collectionStart', e.target.value)} aria-label="Début de la collecte" />
                <input type="date" className={styles.osFieldInput} value={form.collectionEnd || ''} onChange={(e) => upd('collectionEnd', e.target.value)} aria-label="Fin de la collecte" />
              </div>
              {propositionGroupe('periode', ['collectionStart', 'collectionEnd'], () => [
                props.collectionStart && `du ${new Date(props.collectionStart).toLocaleDateString('fr-FR')}`,
                props.collectionEnd ? `au ${new Date(props.collectionEnd).toLocaleDateString('fr-FR')}` : '(collecte en cours)',
              ].filter(Boolean).join(' '))}
            </div>

            {champ('sampleSize', 'Participants', { aide: 'Combien de participants figurent dans les données, et combien ont été exclus, avec la raison.', placeholder: 'Ex. 120 participants ; 4 exclus (consignes non respectées)' })}
            {champ('population', 'Population et recrutement', { aide: 'Qui sont les participants et comment ils ont été recrutés : population (ex. étudiants de L1), lieu ou plateforme (TD, Prolific…), critères d’inclusion, rémunération éventuelle.', textarea: true })}
            {champ('anonymisation', 'Anonymisation', { aide: 'Comment les données ont été rendues anonymes avant le dépôt : identifiants remplacés, réponses libres relues, variables retirées ou regroupées (âge exact, ville…). Des données seulement pseudonymisées ne doivent pas être déposées en accès ouvert.', textarea: true })}
            {champ('funding', 'Financement', { aide: 'Organisme et numéro du contrat. Laissez vide si l’étude n’a pas de financement spécifique.', placeholder: 'Ex. Agence nationale de la recherche, ANR-24-CE28-0001' })}
            {champ('relatedPublication', 'Publication associée', { aide: 'Le DOI de l’article ou de la prépublication qui utilise ces données. Vous pourrez l’ajouter plus tard.', placeholder: 'https://doi.org/…' })}
          </div>

          <div className={styles.osFormGroup}>
            <span className={styles.osFormGroupTitle}>Liens et éthique</span>
            {champ('materialsUrl', 'Lien du matériel en ligne', { placeholder: 'Entrepôt de données (ex. Recherche Data Gouv) ou GitHub' })}
            {champ('dataUrl', 'Lien des données en ligne', { aide: 'Après le dépôt, collez ici le lien (DOI) de votre jeu de données : l’étape « Science ouverte » passe alors à « fait ».', placeholder: 'https://doi.org/…' })}
            {champ('studyEthicsNumber', "N° d'avis éthique (si différent du projet)", { placeholder: 'Laissez vide si identique au projet' })}
          </div>

          <div className={styles.osFieldRow}>
            <label className={styles.osFieldLabel}>Mots-clés</label>
            <div className={styles.osTagInputRow}>
              <input
                className={styles.osFieldInput}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Ex : biais implicite, amorçage… (Entrée pour ajouter)"
              />
              <button className="btn btn-secondary btn-sm" onClick={addTag}>+</button>
            </div>
            {form.keywords?.length > 0 && (
              <div className={styles.osTags} style={{ marginTop: 8 }}>
                {form.keywords.map((k) => (
                  <span key={k} className={styles.osTag}>
                    {k}
                    <button className={styles.osTagRemove} onClick={() => removeTag(k)}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.osFormActions}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Annuler</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
