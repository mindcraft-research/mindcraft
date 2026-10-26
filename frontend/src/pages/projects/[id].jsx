import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import styles from './project.module.css'

// ─── MODAL NOUVELLE ÉTUDE ─────────────────────────────────────────────────────

function NewStudyModal({ projectId, onClose, onCreated }) {
  const [form, setForm] = React.useState({ name: '', description: '' })
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    try {
      const { data } = await api.post('/api/studies', { ...form, projectId })
      toast.success(`Étude "${data.study.name}" créée !`)
      onCreated(data.study)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Nouvelle étude</h2>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className="form-group">
            <label className="form-label">Nom de l'étude *</label>
            <input
              className="form-input"
              placeholder="Ex : Étude pilote — Attitudes climatiques"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optionnelle)</label>
            <textarea
              className="form-input"
              placeholder="Objectifs, paradigme, participants visés…"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.name.trim()}>
              {loading ? 'Création…' : "Créer l'étude"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── MODAL IMPORTER UNE ÉTUDE ─────────────────────────────────────────────────
// Fichier .json (structure) ou .zip (structure + fichiers des tâches et
// médias), exporté de MindCraft ou écrit selon le format documenté. Le serveur
// vérifie d'abord le fichier (aperçu, rien n'est créé), puis crée l'étude.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
const TYPES_BLOCS_FR = {
  WELCOME: ['accueil', 'accueils'], INSTRUCTION: ['instruction', 'instructions'], QUESTION: ['questionnaire', 'questionnaires'],
  STIMULUS: ['tâche', 'tâches'], LOGIC: ['bloc logique', 'blocs logiques'], DEBRIEFING: ['message de fin', 'messages de fin'],
}
const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`

function ImportStudyModal({ projectId, onClose, onImported }) {
  const [fichier, setFichier] = useState(null)
  const [apercu, setApercu] = useState(null) // { resume, avertissements }
  const [erreurs, setErreurs] = useState([])
  const [nom, setNom] = useState('')
  const [etape, setEtape] = useState(null) // 'verification' | 'import'

  const envoyer = (f, extra) => {
    const form = new FormData()
    form.append('projectId', projectId)
    form.append('baseApi', API_BASE)
    for (const [k, v] of Object.entries(extra)) form.append(k, v)
    form.append('file', f)
    return api.post('/api/studies/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  }
  const messages = (err) => err.response?.data?.erreurs || [err.response?.data?.error || 'Le fichier n’a pas pu être envoyé.']

  const choisir = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setFichier(f); setApercu(null); setErreurs([]); setEtape('verification')
    try {
      const { data } = await envoyer(f, { apercu: '1' })
      setApercu(data)
      setNom(data.resume?.nom || '')
    } catch (err) {
      setErreurs(messages(err))
    } finally {
      setEtape(null)
    }
  }

  const importer = async () => {
    if (!fichier || !apercu) return
    setEtape('import')
    try {
      const { data } = await envoyer(fichier, { nom: nom.trim() })
      toast.success(`Étude "${data.study.name}" importée !`)
      onImported(data.study)
    } catch (err) {
      setErreurs(messages(err))
      setEtape(null)
    }
  }

  const r = apercu?.resume
  const parType = r ? Object.entries(r.parType || {}).map(([t, n]) => pluriel(n, ...(TYPES_BLOCS_FR[t] || [t, t]))).join(', ') : ''
  const repris = r ? r.fichiers.zip + r.fichiers.instance + r.fichiers.textes : 0
  const source = r ? [
    `format ${r.format}`,
    r.generePar,
    r.genereLe && !Number.isNaN(Date.parse(r.genereLe)) ? `exporté le ${new Date(r.genereLe).toLocaleDateString('fr-FR')}` : null,
  ].filter(Boolean).join(' · ') : ''

  return (
    <div className={styles.modalOverlay} onClick={etape ? undefined : onClose}>
      <div className={`${styles.modal} ${styles.modalImport}`} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Importer une étude</h2>
        <div className={styles.modalForm}>
          <p className={styles.importIntro}>
            Choisissez un fichier <strong>.json</strong> ou <strong>.zip</strong> exporté de MindCraft
            (onglet Export : « Structure de l&apos;étude » ou « Structure + fichiers »), ou écrit
            selon le <a href="https://github.com/mindcraft-research/mindcraft/blob/main/docs/json-export-format.md" target="_blank" rel="noopener noreferrer">format documenté</a>.
            Ou un questionnaire <strong>LimeSurvey</strong> (.lss, archive .lsa, ou .zip avec le .lss et ses images) ou <strong>Qualtrics</strong> (.qsf) : il est converti automatiquement.
            L&apos;étude est créée en brouillon. Les participants, les réponses, le préenregistrement et le cahier de labo ne sont jamais importés.
          </p>

          <div>
            <label className="btn btn-secondary btn-sm" style={{ cursor: etape ? 'default' : 'pointer' }}>
              {fichier ? 'Choisir un autre fichier' : 'Choisir un fichier'}
              <input type="file" accept=".json,.zip,.lss,.lsa,.qsf,application/json,application/zip" onChange={choisir} disabled={!!etape} style={{ display: 'none' }} />
            </label>
            {fichier && <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--gray-600)' }}>{fichier.name}</span>}
          </div>

          {etape === 'verification' && <p className={styles.importIntro}>Vérification du fichier…</p>}

          {erreurs.length > 0 && (
            <div className={styles.importErreur} role="alert">
              <strong>Import impossible :</strong>
              <ul>{erreurs.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}

          {r && (
            <>
              <div className="form-group">
                <label className="form-label">Nom de l&apos;étude</label>
                <input className="form-input" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={300} />
              </div>
              <div className={styles.importResume}>
                <strong>Ce qui sera créé</strong>
                <ul>
                  <li>{pluriel(r.blocs, 'bloc', 'blocs')}{parType ? ` (${parType})` : ''}</li>
                  <li>{pluriel(r.questions, 'question', 'questions')}</li>
                  {r.facteurs > 0 && <li>{pluriel(r.facteurs, 'facteur', 'facteurs')} ({pluriel(r.niveaux, 'condition', 'conditions')})</li>}
                  {r.langues.length > 0 && <li>Traductions : {r.langues.join(', ')}</li>}
                  {repris > 0 && <li>{pluriel(repris, 'fichier de tâche repris', 'fichiers de tâche repris')}</li>}
                  {r.medias.zip > 0 && <li>{pluriel(r.medias.zip, 'média repris', 'médias repris')}</li>}
                </ul>
                {source && <div className={styles.importSource}>Fichier : {source}</div>}
              </div>
              {apercu.avertissements.length > 0 && (
                <div className={styles.importAlerte}>
                  <strong>À vérifier après l&apos;import :</strong>
                  <ul>{apercu.avertissements.map((m, i) => <li key={i}>{m}</li>)}</ul>
                </div>
              )}
            </>
          )}

          <div className={styles.modalActions}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={!!etape}>Annuler</button>
            <button type="button" className="btn btn-primary" onClick={importer} disabled={!r || !!etape || erreurs.length > 0}>
              {etape === 'import' ? 'Import…' : "Importer l'étude"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const STUDY_STATUS = {
  DRAFT:      { label: 'Brouillon',   cls: 'badge-gray' },
  REVIEW:     { label: 'En révision', cls: 'badge-amber' },
  VALIDATED:  { label: 'Validée',     cls: 'badge-teal' },
  COLLECTING: { label: 'En collecte', cls: 'badge-blue' },
  ARCHIVED:   { label: 'Archivée',    cls: 'badge-coral' },
}

// ─── MODAL INVITATION ────────────────────────────────────────────────────────

function InviteModal({ projectId, onClose, onInvited }) {
  const [form, setForm] = useState({ email: '', role: 'EDITOR' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post(`/api/projects/${projectId}/invite`, form)
      toast.success(`Invitation envoyée à ${form.email}`)
      onInvited()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'invitation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Inviter un collaborateur</h2>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className="form-group">
            <label className="form-label">Adresse e-mail</label>
            <input
              className="form-input"
              type="email"
              placeholder="collaborateur@exemple.fr"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Rôle</label>
            <select
              className="form-input"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              <option value="EDITOR">Éditeur — peut modifier l'étude et voir les données</option>
              <option value="VIEWER">Lecteur — consultation uniquement</option>
            </select>
          </div>
          <div className={styles.modalActions}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Envoi…' : 'Envoyer l\'invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── OPEN SCIENCE CARD ───────────────────────────────────────────────────────

function OpenScienceCard({ project, canEdit, onSave }) {
  const meta = project.metadata || {}
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [tagInput, setTagInput] = useState('')

  const open = () => {
    setForm({
      doi:             meta.doi || '',
      preregistration: meta.preregistration || '',
      materialsUrl:    meta.materialsUrl || '',
      keywords:        meta.keywords || [],
    })
    setTagInput('')
    setEditing(true)
  }

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addTag = () => {
    const t = tagInput.trim()
    if (!t || form.keywords.includes(t)) return
    upd('keywords', [...form.keywords, t])
    setTagInput('')
  }

  const removeTag = (t) => upd('keywords', form.keywords.filter(k => k !== t))

  const save = () => { onSave(form); setEditing(false) }

  const hasData = meta.doi || meta.preregistration || meta.materialsUrl || (meta.keywords?.length > 0)

  const LinkRow = ({ label, url }) => url ? (
    <div className={styles.osRow}>
      <span className={styles.osLabel}>{label}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className={styles.osLink}>
        {url.length > 40 ? url.slice(0, 40) + '…' : url}
      </a>
    </div>
  ) : null

  return (
    <div className={styles.sideCard}>
      <div className={styles.sideCardHeader}>
        <h3 className={styles.sideCardTitle}>
          <span style={{marginRight:6}}>🔬</span>Open Science
        </h3>
        {canEdit && !editing && (
          <button className="btn btn-secondary btn-sm" onClick={open}>
            {hasData ? 'Modifier' : 'Ajouter'}
          </button>
        )}
      </div>

      {!editing && !hasData && (
        <p className={styles.activityEmpty}>
          Ajoutez les métadonnées de l'étude pour favoriser l'open science.
        </p>
      )}

      {!editing && hasData && (
        <div className={styles.osList}>
          <LinkRow label="DOI" url={meta.doi} />
          <LinkRow label="Préenregistrement" url={meta.preregistration} />
          <LinkRow label="Matériel" url={meta.materialsUrl} />
          {meta.keywords?.length > 0 && (
            <div className={styles.osRow}>
              <span className={styles.osLabel}>Mots-clés</span>
              <div className={styles.osTags}>
                {meta.keywords.map(k => <span key={k} className={styles.osTag}>{k}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className={styles.osForm}>
          {[
            { key: 'doi',             label: 'DOI',                  placeholder: 'https://doi.org/10.xxxx/…' },
            { key: 'preregistration', label: 'Préenregistrement',    placeholder: 'MindCraft, AsPredicted ou OSF' },
            { key: 'materialsUrl',    label: 'Matériel en ligne',    placeholder: 'Entrepôt de données (ex. Recherche Data Gouv) ou GitHub' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className={styles.osField}>
              <label className={styles.osFieldLabel}>{label}</label>
              <input
                className={styles.osInput}
                value={form[key]}
                onChange={e => upd(key, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}

          <div className={styles.osField}>
            <label className={styles.osFieldLabel}>Mots-clés</label>
            <div className={styles.osTagInput}>
              <input
                className={styles.osInput}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Ex : biais implicite, amorçage…"
              />
              <button className="btn btn-secondary btn-sm" onClick={addTag}>+</button>
            </div>
            {form.keywords?.length > 0 && (
              <div className={styles.osTags} style={{marginTop:6}}>
                {form.keywords.map(k => (
                  <span key={k} className={styles.osTag}>
                    {k}
                    <button className={styles.osTagRemove} onClick={() => removeTag(k)}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.osActions}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Annuler</button>
            <button className="btn btn-primary btn-sm" onClick={save}>Enregistrer</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PAGE PROJET ──────────────────────────────────────────────────────────────

export default function ProjectPage() {
  const router = useRouter()
  const { id } = router.query
  const queryClient = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [showNewStudy, setShowNewStudy] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [titleVal, setTitleVal] = useState('')
  const [descVal, setDescVal] = useState('')
  // Renommer/supprimer étude
  const [editingStudyId, setEditingStudyId] = useState(null)
  const [editingStudyName, setEditingStudyName] = useState('')
  // Confirmation suppression
  const [confirmDelete, setConfirmDelete] = useState(null) // { type: 'project'|'study', id, name }
  // Activité récente : afficher plus / moins
  const [showAllActivity, setShowAllActivity] = useState(false)

  const saveField = async (patch) => {
    try {
      await api.put(`/api/projects/${id}`, patch)
      queryClient.invalidateQueries({ queryKey: ['project', id] })
    } catch {
      toast.error('Erreur lors de la sauvegarde.')
    }
  }

  const handleRenameStudy = async (studyId, newName) => {
    if (!newName.trim()) return
    try {
      await api.patch(`/api/studies/${studyId}`, { name: newName.trim() })
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      toast.success('Étude renommée.')
    } catch {
      toast.error('Erreur lors du renommage.')
    } finally {
      setEditingStudyId(null)
    }
  }

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return
    try {
      if (confirmDelete.type === 'project') {
        await api.delete(`/api/projects/${confirmDelete.id}`)
        toast.success(`Projet "${confirmDelete.name}" supprimé.`)
        router.push('/dashboard')
      } else {
        await api.delete(`/api/studies/${confirmDelete.id}`)
        toast.success(`Étude "${confirmDelete.name}" supprimée.`)
        queryClient.invalidateQueries({ queryKey: ['project', id] })
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la suppression.')
    } finally {
      setConfirmDelete(null)
    }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/projects/${id}`)
      return data
    },
    enabled: !!id,
  })

  const project = data?.project
  const myRole = data?.myRole

  if (isLoading) return (
    <Layout>
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--gray-400)' }}>
        Chargement…
      </div>
    </Layout>
  )

  if (error || !project) return (
    <Layout>
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--red)', marginBottom: 16 }}>Projet introuvable ou accès refusé.</p>
        <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>
          Retour au dashboard
        </button>
      </div>
    </Layout>
  )

  const canEdit = myRole === 'OWNER' || myRole === 'EDITOR'
  const isOwner = myRole === 'OWNER'

  return (
    <Layout>
      {/* ── Breadcrumb ───────────────────────────────────────────────────────── */}
      <div className={styles.breadcrumb}>
        <button onClick={() => router.push('/dashboard')} className={styles.breadcrumbLink}>
          Mes projets
        </button>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{project.name}</span>
      </div>

      {/* ── En-tête projet ───────────────────────────────────────────────────── */}
      <div className={styles.projectHeader}>
        <div className={styles.projectHeaderLeft}>
          <div className={styles.projectInitial}>{project.name[0]?.toUpperCase()}</div>
          <div className={styles.projectMeta}>
            {/* Titre éditable */}
            {canEdit && editingTitle ? (
              <input
                className={styles.inlineInput}
                value={titleVal}
                onChange={(e) => setTitleVal(e.target.value)}
                onBlur={() => { saveField({ name: titleVal.trim() || project.name }); setEditingTitle(false) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { saveField({ name: titleVal.trim() || project.name }); setEditingTitle(false) }
                  if (e.key === 'Escape') setEditingTitle(false)
                }}
                autoFocus
              />
            ) : (
              <div className={styles.inlineRow}>
                <h1 className={styles.projectTitle}>{project.name}</h1>
                {canEdit && (
                  <button className={styles.inlineEditBtn} onClick={() => { setTitleVal(project.name); setEditingTitle(true) }} title="Modifier le titre">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M11.5 2.5l2 2-9 9-2.5.5.5-2.5 9-9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Description éditable */}
            {canEdit && editingDesc ? (
              <textarea
                className={styles.inlineTextarea}
                value={descVal}
                onChange={(e) => setDescVal(e.target.value)}
                onBlur={() => { saveField({ description: descVal.trim() }); setEditingDesc(false) }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEditingDesc(false)
                }}
                rows={2}
                autoFocus
                placeholder="Ajouter une description…"
              />
            ) : (
              <div className={styles.inlineRow}>
                <p className={styles.projectDesc}>
                  {project.description || (canEdit ? <span style={{color:'var(--gray-400)', fontStyle:'italic'}}>Ajouter une description…</span> : null)}
                </p>
                {canEdit && (
                  <button className={styles.inlineEditBtn} onClick={() => { setDescVal(project.description || ''); setEditingDesc(true) }} title="Modifier la description">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M11.5 2.5l2 2-9 9-2.5.5.5-2.5 9-9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </div>
            )}

            <div className={styles.projectOwner}>
              Propriétaire : <strong>{project.owner.username}</strong>
              {myRole && myRole !== 'OWNER' && (
                <span className="badge badge-blue" style={{ marginLeft: 6 }}>
                  {myRole === 'EDITOR' ? 'Éditeur' : 'Lecteur'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {isOwner && (
            <button
              className="btn btn-sm"
              style={{ color: 'var(--error)', borderColor: 'var(--error-border)', background: 'var(--error-pale)' }}
              onClick={() => setConfirmDelete({ type: 'project', id, name: project.name })}
              title="Supprimer le projet"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 4h10M6 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M5 4l.5 8.5h5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Supprimer le projet
            </button>
          )}
          {canEdit && (
            <button className="btn btn-secondary" onClick={() => setShowImport(true)} title="Créer une étude à partir d'un fichier MindCraft (.json, .zip), LimeSurvey (.lss, .lsa) ou Qualtrics (.qsf)">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M8 10V2M5 5l3-3 3 3M3 10v3h10v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Importer une étude
            </button>
          )}
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowNewStudy(true)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Nouvelle étude
            </button>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        {/* ── Études ───────────────────────────────────────────────────────── */}
        <section className={styles.mainCol}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Études</h2>
            <span className={styles.sectionCount}>{project.studies.length}</span>
          </div>

          {project.studies.length === 0 ? (
            <div className={styles.emptySection}>
              <p>Aucune étude pour l'instant.</p>
              {canEdit && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowNewStudy(true)}>
                    Créer la première étude
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowImport(true)}>
                    Importer une étude
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.studiesList}>
              {project.studies.map((study) => {
                const status = STUDY_STATUS[study.status] || STUDY_STATUS.DRAFT
                const isRenaming = editingStudyId === study.id
                return (
                  <div key={study.id} className={styles.studyRow} data-status={study.status}>
                    <div className={styles.studyInfo}>
                      {isRenaming ? (
                        <input
                          className={styles.inlineInput}
                          style={{ fontSize: 14, padding: '3px 8px', maxWidth: 260 }}
                          value={editingStudyName}
                          autoFocus
                          onChange={(e) => setEditingStudyName(e.target.value)}
                          onBlur={() => handleRenameStudy(study.id, editingStudyName)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameStudy(study.id, editingStudyName)
                            if (e.key === 'Escape') setEditingStudyId(null)
                          }}
                        />
                      ) : (
                        <div className={styles.inlineRow}>
                          <span className={styles.studyName}>{study.name}</span>
                          {canEdit && (
                            <button
                              className={styles.inlineEditBtn}
                              title="Renommer"
                              onClick={() => { setEditingStudyId(study.id); setEditingStudyName(study.name) }}
                            >
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                <path d="M11.5 2.5l2 2-9 9-2.5.5.5-2.5 9-9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                      <span className={`badge ${status.cls}`}>{status.label}</span>
                      {/* Progression du recrutement (visible si au moins
                          un participant a démarré l'étude) */}
                      {study.recruitment?.started > 0 && (
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--gray-500)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                          title={
                            study.recruitment.targetN
                              ? `${study.recruitment.completed} participant·e·s ont terminé l'étude sur un objectif de ${study.recruitment.targetN}`
                              : `${study.recruitment.completed} participant·e·s ont terminé l'étude (${study.recruitment.started} démarrées)`
                          }
                        >
                          {study.recruitment.targetN
                            ? `${study.recruitment.completed} / ${study.recruitment.targetN} (${Math.round(study.recruitment.progress * 100)} %)`
                            : `${study.recruitment.completed} terminée${study.recruitment.completed > 1 ? 's' : ''}`}
                        </span>
                      )}
                    </div>
                    <div className={styles.studyMeta}>
                      v{study.version} · {new Date(study.updatedAt).toLocaleDateString('fr-FR')}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {/* (crayon désormais dans inlineRow au-dessus) */}
                      {canEdit && (
                        <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/studies/${study.id}`)}>Ouvrir</button>
                      )}
                      {canEdit && (
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Dupliquer l'étude"
                          onClick={async () => {
                            try {
                              const { data } = await api.post(`/api/studies/${study.id}/duplicate`)
                              queryClient.invalidateQueries({ queryKey: ['project', id] })
                            } catch { alert('Erreur lors de la duplication') }
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                            <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.3"/>
                          </svg>
                        </button>
                      )}
                      {isOwner && (
                        <button
                          className="btn btn-sm"
                          style={{ color: 'var(--error)', borderColor: 'var(--error-border)', background: 'var(--error-pale)' }}
                          title="Supprimer l'étude"
                          onClick={() => setConfirmDelete({ type: 'study', id: study.id, name: study.name })}
                        >
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <path d="M3 4h10M6 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M5 4l.5 8.5h5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className={styles.sidebar}>
          {/* Collaborateurs */}
          <div className={styles.sideCard}>
            <div className={styles.sideCardHeader}>
              <h3 className={styles.sideCardTitle}>Équipe</h3>
              {isOwner && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowInvite(true)}>
                  Inviter
                </button>
              )}
            </div>

            <div className={styles.membersList}>
              {/* Propriétaire */}
              <div className={styles.memberRow}>
                <div className={styles.memberAvatar}>
                  {project.owner.username[0].toUpperCase()}
                </div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{project.owner.username}</span>
                  <span className={styles.memberEmail}>{project.owner.email}</span>
                </div>
                <span className="badge badge-blue">Propriétaire</span>
              </div>

              {/* Collaborateurs */}
              {project.collaborators.map((c) => (
                <div key={c.id} className={styles.memberRow}>
                  <div className={styles.memberAvatar}>
                    {c.user.username[0].toUpperCase()}
                  </div>
                  <div className={styles.memberInfo}>
                    <span className={styles.memberName}>{c.user.username}</span>
                    <span className={styles.memberEmail}>{c.user.email}</span>
                  </div>
                  <span className={`badge ${c.role === 'EDITOR' ? 'badge-teal' : 'badge-gray'}`}>
                    {c.role === 'EDITOR' ? 'Éditeur' : 'Lecteur'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Journal d'activité */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Activité récente</h3>
            <div className={styles.activityList}>
              {project.activityLogs.length === 0 ? (
                <p className={styles.activityEmpty}>Aucune activité.</p>
              ) : (
                (showAllActivity ? project.activityLogs : project.activityLogs.slice(0, 5)).map((log) => {
                  const dotType = log.action?.includes('créé') || log.action?.includes('ajouté') ? 'add'
                    : log.action?.includes('supprimé') ? 'delete' : 'update'
                  return (
                    <div key={log.id} className={styles.activityRow}>
                      <div className={styles.activityDot} data-type={dotType} />
                      <div className={styles.activityBody}>
                        <span className={styles.activityText}>{log.details}</span>
                        <span className={styles.activityDate}>
                          {new Date(log.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            {project.activityLogs.length > 5 && (
              <button
                type="button"
                className={styles.activityToggle}
                onClick={() => setShowAllActivity((v) => !v)}
              >
                {showAllActivity
                  ? 'Masquer'
                  : `Voir ${project.activityLogs.length - 5} activité${project.activityLogs.length - 5 > 1 ? 's' : ''} de plus`}
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* ── Modal invitation ─────────────────────────────────────────────────── */}
      {showNewStudy && (
        <NewStudyModal
          projectId={id}
          onClose={() => setShowNewStudy(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['project', id] })}
        />
      )}

      {showImport && (
        <ImportStudyModal
          projectId={id}
          onClose={() => setShowImport(false)}
          onImported={(study) => {
            queryClient.invalidateQueries({ queryKey: ['project', id] })
            router.push(`/studies/${study.id}`)
          }}
        />
      )}

      {showInvite && (
        <InviteModal
          projectId={id}
          onClose={() => setShowInvite(false)}
          onInvited={() => queryClient.invalidateQueries({ queryKey: ['project', id] })}
        />
      )}

      {/* ── Modal confirmation suppression ───────────────────────────────────── */}
      {confirmDelete && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🗑️</div>
              <h2 className={styles.modalTitle} style={{ color: 'var(--error)' }}>
                {confirmDelete.type === 'project' ? 'Supprimer le projet ?' : 'Supprimer cette étude ?'}
              </h2>
            </div>
            <p style={{ color: 'var(--gray-600)', fontSize: 14, textAlign: 'center', marginBottom: 4 }}>
              Vous allez supprimer <strong>"{confirmDelete.name}"</strong>.
            </p>
            <p style={{ color: 'var(--error)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
              {confirmDelete.type === 'project'
                ? 'Toutes les études, blocs, questions et données associées seront définitivement supprimés.'
                : 'Tous les blocs, questions et données de cette étude seront définitivement supprimés.'}
              {' '}Cette action est irréversible.
            </p>
            <div className={styles.modalActions}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
                Annuler
              </button>
              <button
                className="btn"
                style={{ background: 'var(--error)', color: '#fff', border: 'none' }}
                onClick={handleDeleteConfirmed}
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
