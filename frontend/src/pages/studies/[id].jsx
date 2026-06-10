import { useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import BlockPalette from '../../components/builder/BlockPalette'
import BlockCanvas from '../../components/builder/BlockCanvas'
import BlockInspector from '../../components/builder/BlockInspector'
import DesignConfigurator from '../../components/builder/DesignConfigurator'
import ParticipationLinkPanel from '../../components/builder/ParticipationLinkPanel'
import ExportPanel from '../../components/builder/ExportPanel'
import PhysioPanel from '../../components/builder/PhysioPanel'
import styles from './builder.module.css'

export default function StudyBuilderPage() {
  const router = useRouter()
  const { id } = router.query
  const queryClient = useQueryClient()

  const [selectedBlockId, setSelectedBlockId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('builder')
  const [builderTab, setBuilderTab] = useState('structure') // 'structure' | 'configure'

  const { data, isLoading, error } = useQuery({
    queryKey: ['study', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/studies/${id}`)
      return data
    },
    enabled: !!id,
  })

  const study = data?.study
  const selectedBlock = study?.blocks?.find((b) => b.id === selectedBlockId) || null

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['study', id] })
  }, [queryClient, id])

  // ── Ajouter un bloc ────────────────────────────────────────────────────────
  // `insertAt` (optionnel) : position d'insertion souhaitée dans la liste.
  // Si fourni, le bloc est créé à la fin (côté backend) puis réordonné
  // côté API pour atterrir à la bonne position. Si null, le bloc reste à la fin.
  const handleAddBlock = async (type, insertAt = null) => {
    setSaving(true)
    try {
      const defaultSettings = getDefaultSettings(type)
      const { data } = await api.post(`/api/studies/${id}/blocks`, { type, settings: defaultSettings })
      const newBlockId = data.block.id
      setSelectedBlockId(newBlockId)

      if (insertAt !== null && Array.isArray(study?.blocks)) {
        // L'API a placé le bloc à la fin. On reconstruit l'ordre voulu :
        // les blocs existants + le nouveau au bon index.
        const existingIds = study.blocks.map((b) => b.id)
        const desiredOrder = [...existingIds]
        const safeIndex = Math.max(0, Math.min(insertAt, desiredOrder.length))
        desiredOrder.splice(safeIndex, 0, newBlockId)
        try {
          await api.put(`/api/studies/${id}/blocks/reorder`, { order: desiredOrder })
        } catch {
          // Si le réordonnancement échoue, le bloc reste simplement à la fin
        }
      }

      invalidate()
      toast.success('Bloc ajouté')
    } catch {
      toast.error('Erreur lors de l\'ajout du bloc')
    } finally {
      setSaving(false)
    }
  }

  // ── Supprimer un bloc ──────────────────────────────────────────────────────
  const handleDeleteBlock = async (blockId) => {
    setSaving(true)
    try {
      await api.delete(`/api/studies/${id}/blocks/${blockId}`)
      if (selectedBlockId === blockId) setSelectedBlockId(null)
      invalidate()
      toast.success('Bloc supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setSaving(false)
    }
  }

  // ── Dupliquer un bloc ──────────────────────────────────────────────────────
  const handleDuplicateBlock = async (blockId) => {
    setSaving(true)
    try {
      const { data } = await api.post(`/api/studies/${id}/blocks/${blockId}/duplicate`)
      invalidate()
      setSelectedBlockId(data.block.id)
      toast.success('Bloc dupliqué')
    } catch {
      toast.error('Erreur lors de la duplication')
    } finally {
      setSaving(false)
    }
  }

  // ── Réordonner les blocs ───────────────────────────────────────────────────
  const handleReorder = async (newOrder) => {
    try {
      await api.put(`/api/studies/${id}/blocks/reorder`, { order: newOrder })
      invalidate()
    } catch {
      toast.error('Erreur lors de la réorganisation')
    }
  }

  // ── Sauvegarder un bloc ────────────────────────────────────────────────────
  const handleSaveBlock = async (blockId, settings) => {
    setSaving(true)
    try {
      await api.put(`/api/studies/${id}/blocks/${blockId}`, { settings })
      invalidate()
      toast.success('Sauvegardé')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // ── Ajouter une question ───────────────────────────────────────────────────
  const handleSaveQuestion = async (blockId, questionData, questionId = null) => {
    setSaving(true)
    try {
      if (questionId) {
        await api.put(`/api/studies/${id}/blocks/${blockId}/questions/${questionId}`, questionData)
      } else {
        await api.post(`/api/studies/${id}/blocks/${blockId}/questions`, questionData)
      }
      invalidate()
      toast.success('Question sauvegardée')
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Erreur inconnue'
      console.error('[handleSaveQuestion]', err?.response?.status, msg, err?.response?.data)
      toast.error(`Erreur sauvegarde : ${msg}`)
      // Re-throw pour que la modal d'édition ne se ferme pas (issue #83
      // point 2) : sans ça, l'utilisateur·rice perd toute la saisie si le
      // backend rejette pour une raison non détectée côté client.
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuestion = async (blockId, questionId) => {
    setSaving(true)
    try {
      await api.delete(`/api/studies/${id}/blocks/${blockId}/questions/${questionId}`)
      invalidate()
      toast.success('Question supprimée')
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicateQuestion = async (blockId, questionId) => {
    setSaving(true)
    try {
      await api.post(`/api/studies/${id}/blocks/${blockId}/questions/${questionId}/duplicate`)
      invalidate()
      toast.success('Question dupliquée')
    } catch {
      toast.error('Erreur lors de la duplication')
    } finally {
      setSaving(false)
    }
  }


  if (isLoading) return (
    <Layout>
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--gray-400)' }}>Chargement…</div>
    </Layout>
  )

  if (error || !study) return (
    <Layout>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--red)', marginBottom: 16 }}>Étude introuvable.</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>Retour</button>
      </div>
    </Layout>
  )

  return (
    <Layout>
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            ← {study.project.name}
          </button>
          <div className={styles.studyInfo}>
            <h1 className={styles.studyTitle}>{study.name}</h1>
            <span className={styles.studyMeta}>
              v{study.version} · {study.blocks.length} bloc{study.blocks.length !== 1 ? 's' : ''}
              {saving && <span className={styles.saving}> · Sauvegarde…</span>}
            </span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <StatusSelect studyId={id} status={study.status} onChanged={invalidate} />
          <ParticipationLinkPanel study={study} onStatusChange={invalidate} />
          <a
            href={`/run/${id}?preview=1`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
          >
            Prévisualiser
          </a>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'builder' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('builder')}
        >Constructeur</button>
        <button
          className={`${styles.tab} ${activeTab === 'design' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('design')}
        >Design</button>
        <button
          className={`${styles.tab} ${activeTab === 'physio' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('physio')}
        >Mesures physio</button>
        <button
          className={`${styles.tab} ${activeTab === 'openscience' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('openscience')}
        >Open Science</button>
        <button
          className={`${styles.tab} ${activeTab === 'export' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('export')}
        >Export</button>
      </div>

      {/* ── Builder ──────────────────────────────────────────────────────────── */}
      {activeTab === 'builder' && (
        <div className={styles.builderMobileNotice}>
          <div className={styles.builderMobileNoticeTitle}>📐 L'éditeur s'ouvre sur ordinateur</div>
          La construction d'études (palette de blocs, configuration, drag & drop) nécessite un grand écran.<br />
          Les autres onglets (design, science ouverte, export) restent consultables ici.
        </div>
      )}
      {activeTab === 'builder' && (
        <div className={styles.builder}>
          {/* Palette toujours visible à gauche */}
          <BlockPalette onAdd={handleAddBlock} />

          {/* Zone principale avec sous-onglets */}
          <div className={styles.builderMain}>
            <div className={styles.builderSubTabs}>
              <button
                className={`${styles.builderSubTab} ${builderTab === 'structure' ? styles.builderSubTabActive : ''}`}
                onClick={() => setBuilderTab('structure')}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                </svg>
                Structure
                {study.blocks.length > 0 && (
                  <span className={styles.builderTabCount}>{study.blocks.length}</span>
                )}
              </button>
              <button
                className={`${styles.builderSubTab} ${builderTab === 'configure' ? styles.builderSubTabActive : ''}`}
                onClick={() => setBuilderTab('configure')}
                disabled={!selectedBlock}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M11.54 4.46l1.41-1.41M3.05 12.95l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                {selectedBlock
                  ? `Configurer · ${selectedBlock.label || { WELCOME: "Message d'accueil", INSTRUCTION: 'Instruction', QUESTION: 'Questionnaire', STIMULUS: 'Tâche', LOGIC: 'Logique', DEBRIEFING: 'Message de fin' }[selectedBlock.type] || selectedBlock.type}`
                  : 'Configurer'}
              </button>
            </div>

            <div className={styles.builderContent}>
              {builderTab === 'structure' && (
                <BlockCanvas
                  blocks={study.blocks}
                  selectedBlockId={selectedBlockId}
                  onSelect={(id) => { setSelectedBlockId(id); setBuilderTab('configure') }}
                  onDelete={handleDeleteBlock}
                  onDuplicate={handleDuplicateBlock}
                  onReorder={handleReorder}
                  onAddBlock={handleAddBlock}
                  physioConfig={study.metadata?.physio}
                />
              )}
              {builderTab === 'configure' && (
                <div className={styles.inspectorWrap}>
                  <BlockInspector
                    block={selectedBlock}
                    studyId={id}
                    onSaveBlock={handleSaveBlock}
                    onSaveQuestion={handleSaveQuestion}
                    onDeleteQuestion={handleDeleteQuestion}
                    onDuplicateQuestion={handleDuplicateQuestion}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Design expérimental ──────────────────────────────────────────────── */}
      {activeTab === 'design' && (
        <div className={styles.designPanel}>
          <DesignConfigurator studyId={id} blocks={study.blocks} />
        </div>
      )}

      {/* ── Export ───────────────────────────────────────────────────────────── */}
      {activeTab === 'export' && (
        <div className={styles.designPanel}>
          <ExportPanel studyId={id} studyName={study.name} />
        </div>
      )}

      {/* ── Physio ──────────────────────────────────────────────────────────── */}
      {activeTab === 'physio' && (
        <div className={styles.designPanel}>
          <PhysioPanel study={study} onSave={async (physioConfig) => {
            const meta = { ...(study.metadata || {}), physio: physioConfig }
            await api.patch(`/api/studies/${id}`, { metadata: meta })
            invalidate()
          }} />
        </div>
      )}

      {/* ── Open Science ─────────────────────────────────────────────────────── */}
      {activeTab === 'openscience' && (
        <div className={styles.designPanel}>
          <StudyOpenSciencePanel study={study} onSave={async (meta) => {
            await api.patch(`/api/studies/${id}`, { metadata: meta })
            invalidate()
          }} />
        </div>
      )}
    </Layout>
  )
}

const STATUS_LABEL = {
  DRAFT: 'Brouillon', REVIEW: 'En révision',
  VALIDATED: 'Validée', COLLECTING: 'En collecte', ARCHIVED: 'Archivée',
}
const STATUS_COLOR = {
  DRAFT: 'gray', REVIEW: 'amber', VALIDATED: 'teal', COLLECTING: 'blue', ARCHIVED: 'coral',
}

// ─── OPEN SCIENCE PANEL ───────────────────────────────────────────────────────

function StudyOpenSciencePanel({ study, onSave }) {
  const meta = study.metadata || {}
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  const open = () => {
    setForm({
      projectTitle:       meta.projectTitle        ?? (study.project?.name || ''),
      projectDescription: meta.projectDescription  ?? '',
      projectDoi:         meta.projectDoi          ?? '',
      projectEthicsNumber: meta.projectEthicsNumber ?? '',
      studyTitle:         meta.studyTitle          ?? study.name ?? '',
      studyDescription:   meta.studyDescription    ?? (study.description || ''),
      preregistration:    meta.preregistration     ?? '',
      materialsUrl:       meta.materialsUrl        ?? '',
      dataUrl:            meta.dataUrl             ?? '',
      studyEthicsNumber:  meta.studyEthicsNumber   ?? '',
      keywords:           meta.keywords            ?? [],
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

  const save = async () => {
    setSaving(true)
    try { await onSave(form); setEditing(false) }
    finally { setSaving(false) }
  }

  const hasData = meta.projectTitle || meta.projectDoi || meta.projectEthicsNumber ||
    meta.studyTitle || meta.preregistration || meta.materialsUrl || meta.dataUrl ||
    meta.studyEthicsNumber || (meta.keywords?.length > 0)

  const TextRow = ({ label, value }) => value ? (
    <div className={styles.osRow}>
      <span className={styles.osLabel}>{label}</span>
      <span className={styles.osText}>{value}</span>
    </div>
  ) : null

  const LinkRow = ({ label, url }) => url ? (
    <div className={styles.osRow}>
      <span className={styles.osLabel}>{label}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className={styles.osLink}>
        {url.length > 60 ? url.slice(0, 60) + '…' : url}
      </a>
    </div>
  ) : null

  /* ── Helpers for the form (rendered inline, not as sub-components, to avoid focus loss) ── */
  const renderField = (fieldKey, label, placeholder, textarea) => (
    <div className={styles.osFieldRow} key={fieldKey}>
      <label className={styles.osFieldLabel}>{label}</label>
      {textarea
        ? <textarea
            className={styles.osFieldInput}
            style={{resize:'vertical', minHeight:64}}
            value={form[fieldKey]}
            onChange={e => upd(fieldKey, e.target.value)}
            placeholder={placeholder}
          />
        : <input
            className={styles.osFieldInput}
            value={form[fieldKey]}
            onChange={e => upd(fieldKey, e.target.value)}
            placeholder={placeholder}
          />
      }
    </div>
  )

  return (
    <div className={styles.osPanelWrap}>
      <div className={styles.osPanelHeader}>
        <div>
          <h2 className={styles.osPanelTitle}>🔬 Open Science</h2>
          <p className={styles.osPanelDesc}>
            Renseignez les métadonnées de cette étude pour favoriser la transparence et la reproductibilité.
          </p>
        </div>
        {!editing && (
          <button className="btn btn-primary btn-sm" onClick={open}>
            {hasData ? 'Modifier' : 'Ajouter des métadonnées'}
          </button>
        )}
      </div>

      {/* ── Vue ── */}
      {!editing && !hasData && (
        <div className={styles.osEmpty}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.2">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <p>Aucune métadonnée renseignée.</p>
          <p style={{fontSize:'12px'}}>Ajoutez titre, DOI, préenregistrement, matériel et mots-clés.</p>
        </div>
      )}

      {!editing && hasData && (
        <div className={styles.osDataGrid}>
          {(meta.projectTitle || meta.projectDescription || meta.projectDoi || meta.projectEthicsNumber) && (
            <div className={styles.osGroup}>
              <span className={styles.osGroupLabel}>Projet</span>
              <TextRow label="Titre du projet"       value={meta.projectTitle} />
              <TextRow label="Description du projet" value={meta.projectDescription} />
              <LinkRow label="DOI du projet"         url={meta.projectDoi} />
              <TextRow label="N° d'avis éthique (CER / CPP)" value={meta.projectEthicsNumber} />
            </div>
          )}
          {(meta.studyTitle || meta.studyDescription || meta.preregistration || meta.materialsUrl || meta.dataUrl || meta.studyEthicsNumber) && (
            <div className={styles.osGroup}>
              <span className={styles.osGroupLabel}>Étude</span>
              <TextRow label="Titre de l'étude"       value={meta.studyTitle} />
              <TextRow label="Description de l'étude" value={meta.studyDescription} />
              <LinkRow label="Préenregistrement"      url={meta.preregistration} />
              <LinkRow label="Matériel en ligne"      url={meta.materialsUrl} />
              <LinkRow label="Données en ligne"       url={meta.dataUrl} />
              <TextRow label="N° d'avis éthique (si différent du projet)" value={meta.studyEthicsNumber} />
            </div>
          )}
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

      {/* ── Formulaire ── */}
      {editing && (
        <div className={styles.osFormPanel}>

          <div className={styles.osFormGroup}>
            <span className={styles.osFormGroupTitle}>Projet de recherche</span>
            {renderField('projectTitle',        'Titre du projet',       study.project?.name || 'Nom du projet de recherche')}
            {renderField('projectDescription',  'Description du projet', 'Résumé du projet global…', true)}
            {renderField('projectDoi',          'DOI du projet',         'https://doi.org/10.17605/osf.io/…')}
            {renderField('projectEthicsNumber', "N° d'avis éthique (CER / CPP)", 'Ex. CER-2024-001 ou CPP 24.XX.XX.XXXXX')}
          </div>

          <div className={styles.osFormGroup}>
            <span className={styles.osFormGroupTitle}>Cette étude</span>
            {renderField('studyTitle',         "Titre de l'étude",          study.name)}
            {renderField('studyDescription',   "Description de l'étude",    'Résumé de cette étude spécifique…', true)}
            {renderField('preregistration',    'Lien du préenregistrement', 'https://osf.io/… ou AsPredicted')}
            {renderField('materialsUrl',       'Lien du matériel en ligne', 'https://osf.io/… ou GitHub')}
            {renderField('dataUrl',            'Lien des données en ligne', 'https://osf.io/… ou Zenodo')}
            {renderField('studyEthicsNumber',  "N° d'avis éthique (si différent du projet)", 'Laissez vide si identique au projet')}
          </div>

          <div className={styles.osFieldRow}>
            <label className={styles.osFieldLabel}>Mots-clés</label>
            <div className={styles.osTagInputRow}>
              <input
                className={styles.osFieldInput}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Ex : biais implicite, amorçage… (Entrée pour ajouter)"
              />
              <button className="btn btn-secondary btn-sm" onClick={addTag}>+</button>
            </div>
            {form.keywords?.length > 0 && (
              <div className={styles.osTags} style={{marginTop:8}}>
                {form.keywords.map(k => (
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

// ─── SÉLECTEUR DE STATUT ─────────────────────────────────────────────────────

const ALL_STATUSES = [
  { value: 'DRAFT',      label: 'Brouillon',    color: 'gray'  },
  { value: 'REVIEW',     label: 'En révision',  color: 'amber' },
  { value: 'VALIDATED',  label: 'Validée',      color: 'teal'  },
  { value: 'COLLECTING', label: 'En collecte',  color: 'blue'  },
  { value: 'ARCHIVED',   label: 'Archivée',     color: 'coral' },
]

function StatusSelect({ studyId, status, onChanged }) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const current = ALL_STATUSES.find(s => s.value === status) || ALL_STATUSES[0]

  const change = async (newStatus) => {
    if (newStatus === status) { setOpen(false); return }
    setLoading(true)
    setOpen(false)
    try {
      await api.patch(`/api/studies/${studyId}/status`, { status: newStatus })
      onChanged?.()
      toast.success(`Statut mis à jour : ${ALL_STATUSES.find(s => s.value === newStatus)?.label}`)
    } catch {
      toast.error('Erreur lors du changement de statut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={`badge badge-${current.color}`}
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        style={{
          cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center',
          gap: 5, padding: '4px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12,
        }}
        title="Changer le statut"
      >
        {loading ? '…' : current.label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 1000,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            minWidth: 160, overflow: 'hidden',
          }}>
            {ALL_STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => change(s.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 14px', background: 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: 13, fontWeight: s.value === status ? 700 : 400,
                  color: s.value === status ? 'var(--brand)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span className={`badge badge-${s.color}`} style={{padding:'2px 8px',fontSize:11}}>{s.label}</span>
                {s.value === status && <span style={{marginLeft:'auto', fontSize:11}}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function getDefaultSettings(type) {
  switch (type) {
    case 'INSTRUCTION': return { title: 'Instructions', content: '', buttonLabel: 'Continuer' }
    case 'QUESTION':    return { randomizeOrder: false }
    case 'DEBRIEFING':  return { title: 'Merci !', content: '', redirectUrl: '' }
    case 'LOGIC':       return { conditions: [] }
    default:            return {}
  }
}
