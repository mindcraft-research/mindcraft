import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { Tooltip, Toggle } from './FormWidgets'
import DesignMatrixPreview from './DesignMatrixPreview'
import styles from './DesignConfigurator.module.css'

const DESIGN_TYPES = [
  { value: 'BETWEEN', label: 'Inter-sujet', icon: '||', desc: 'Groupes indépendants' },
  { value: 'WITHIN',  label: 'Intra-sujet', icon: '⟳', desc: 'Mesures répétées' },
  { value: 'MIXED',   label: 'Mixte',       icon: '⊞', desc: 'Facteurs inter + intra' },
]

const CB_METHODS = [
  { value: 'LATIN_SQUARE', label: 'Carré latin', desc: 'Rotation classique' },
  { value: 'WILLIAMS',     label: 'Williams',    desc: 'Séquences équilibrées' },
  { value: 'RANDOM',       label: 'Aléatoire',   desc: 'Ordre aléatoire' },
]

export default function DesignConfigurator({ studyId, blocks }) {
  const queryClient = useQueryClient()

  // ── Charger le design ─────────────────────────────────────────────────────
  const { data: designData, isLoading } = useQuery({
    queryKey: ['design', studyId],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/api/studies/${studyId}/design`)
        return data.design
      } catch (err) {
        if (err.response?.status === 404) return null
        throw err
      }
    },
    enabled: !!studyId,
  })

  const design = designData

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['design', studyId] })
    queryClient.invalidateQueries({ queryKey: ['study', studyId] })
  }, [queryClient, studyId])

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createDesign = useMutation({
    mutationFn: (body) => api.post(`/api/studies/${studyId}/design`, body),
    onSuccess: () => { invalidate(); toast.success('Design créé') },
    onError: () => toast.error('Erreur lors de la création du design'),
  })

  const updateDesign = useMutation({
    mutationFn: (body) => api.put(`/api/studies/${studyId}/design`, body),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Erreur'),
  })

  const deleteDesign = useMutation({
    mutationFn: () => api.delete(`/api/studies/${studyId}/design`),
    onSuccess: () => { invalidate(); toast.success('Design supprimé') },
  })

  const addFactor = useMutation({
    mutationFn: (body) => api.post(`/api/studies/${studyId}/design/factors`, body),
    onSuccess: () => { invalidate(); toast.success('Facteur ajouté') },
    onError: () => toast.error('Erreur'),
  })

  const updateFactor = useMutation({
    mutationFn: ({ factorId, ...body }) => api.put(`/api/studies/${studyId}/design/factors/${factorId}`, body),
    onSuccess: () => invalidate(),
  })

  const deleteFactor = useMutation({
    mutationFn: (factorId) => api.delete(`/api/studies/${studyId}/design/factors/${factorId}`),
    onSuccess: () => { invalidate(); toast.success('Facteur supprimé') },
  })

  const addLevel = useMutation({
    mutationFn: ({ factorId, ...body }) => api.post(`/api/studies/${studyId}/design/factors/${factorId}/levels`, body),
    onSuccess: () => { invalidate(); toast.success('Niveau ajouté') },
    onError: () => toast.error('Erreur'),
  })

  const updateLevel = useMutation({
    mutationFn: ({ factorId, levelId, ...body }) =>
      api.put(`/api/studies/${studyId}/design/factors/${factorId}/levels/${levelId}`, body),
    onSuccess: () => invalidate(),
  })

  const deleteLevel = useMutation({
    mutationFn: ({ factorId, levelId }) =>
      api.delete(`/api/studies/${studyId}/design/factors/${factorId}/levels/${levelId}`),
    onSuccess: () => { invalidate(); toast.success('Niveau supprimé') },
  })

  // ── État pour nouveau facteur + targetN local ────────────────────────────
  const [newFactorName, setNewFactorName] = useState('')
  const [targetNLocal, setTargetNLocal] = useState(null)

  if (isLoading) {
    return <div className={styles.container}><div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 40 }}>Chargement…</div></div>
  }

  // ── Pas de design → Création ──────────────────────────────────────────────
  if (!design) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚗</div>
          <p className={styles.emptyText}>Aucun design expérimental défini pour cette étude.</p>
          <div className={styles.typeGrid}>
            {DESIGN_TYPES.map((t) => (
              <div
                key={t.value}
                className={styles.typeCard}
                onClick={() => createDesign.mutate({ designType: t.value })}
              >
                <div className={styles.typeIcon}>{t.icon}</div>
                <div className={styles.typeName}>{t.label}</div>
                <div className={styles.typeDesc}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Design existant → Configuration ───────────────────────────────────────

  const hasWithinFactors = design.factors.some((f) => f.type === 'WITHIN')
  const hasBetweenFactors = design.factors.some((f) => f.type === 'BETWEEN')

  // Déterminer le type de facteur par défaut pour un nouveau facteur
  const getDefaultFactorType = () => {
    if (design.designType === 'BETWEEN') return 'BETWEEN'
    if (design.designType === 'WITHIN') return 'WITHIN'
    return 'BETWEEN'
  }

  return (
    <div className={styles.container}>

      {/* ── Type de design ─────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Type de design</span>
          <button className={styles.deleteDesignBtn} onClick={() => {
            if (confirm('Supprimer le design expérimental ? Les facteurs et niveaux seront perdus.')) {
              deleteDesign.mutate()
            }
          }}>Supprimer le design</button>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.typeGrid}>
            {DESIGN_TYPES.map((t) => (
              <div
                key={t.value}
                className={`${styles.typeCard} ${design.designType === t.value ? styles.typeCardActive : ''}`}
                onClick={() => updateDesign.mutate({ designType: t.value })}
              >
                <div className={styles.typeIcon}>{t.icon}</div>
                <div className={styles.typeName}>{t.label}</div>
                <div className={styles.typeDesc}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Facteurs ───────────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            Facteurs ({design.factors.length})
            <Tooltip text="Chaque facteur représente une variable indépendante. Ajoutez des niveaux à chaque facteur, puis liez-les aux blocs de l'étude." />
          </span>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.factorList}>
            {design.factors.map((factor) => (
              <FactorEditor
                key={factor.id}
                factor={factor}
                blocks={blocks}
                designType={design.designType}
                onUpdateFactor={(data) => updateFactor.mutate({ factorId: factor.id, ...data })}
                onDeleteFactor={() => deleteFactor.mutate(factor.id)}
                onAddLevel={(data) => addLevel.mutate({ factorId: factor.id, ...data })}
                onUpdateLevel={(levelId, data) => updateLevel.mutate({ factorId: factor.id, levelId, ...data })}
                onDeleteLevel={(levelId) => deleteLevel.mutate({ factorId: factor.id, levelId })}
              />
            ))}
          </div>

          {/* Ajouter un facteur */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="form-input"
              style={{ flex: 1, fontSize: 12 }}
              value={newFactorName}
              onChange={(e) => setNewFactorName(e.target.value)}
              placeholder="Nom du nouveau facteur (ex: Émotion, Charge cognitive…)"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFactorName.trim()) {
                  addFactor.mutate({ name: newFactorName.trim(), type: getDefaultFactorType() })
                  setNewFactorName('')
                }
              }}
            />
            <button
              className="btn btn-primary btn-sm"
              disabled={!newFactorName.trim()}
              onClick={() => {
                addFactor.mutate({ name: newFactorName.trim(), type: getDefaultFactorType() })
                setNewFactorName('')
              }}
            >+ Facteur</button>
          </div>
        </div>
      </div>

      {/* ── Contrebalancement (si intra-sujet) ─────────────────────────────── */}
      {hasWithinFactors && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              Contrebalancement
              <Tooltip text="Méthode de contrebalancement pour les facteurs intra-sujet. Contrôle l'ordre de présentation des conditions." />
            </span>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.methodGrid}>
              {CB_METHODS.map((m) => (
                <div
                  key={m.value}
                  className={`${styles.methodCard} ${design.counterbalanceMethod === m.value ? styles.methodCardActive : ''}`}
                  onClick={() => updateDesign.mutate({ counterbalanceMethod: m.value })}
                >
                  <div className={styles.methodName}>{m.label}</div>
                  <div className={styles.methodDesc}>{m.desc}</div>
                </div>
              ))}
            </div>

            {design.counterbalanceMethod !== 'RANDOM' && hasWithinFactors && (
              <div className={styles.infoBox}>
                {design.counterbalanceMethod === 'LATIN_SQUARE'
                  ? `Carré latin : ${design.factors.find(f => f.type === 'WITHIN')?.levels.length || '?'} ordres de présentation, assignés cycliquement aux participants.`
                  : `Williams : séquences équilibrées où chaque condition est précédée par chaque autre exactement une fois.`
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Échantillon ────────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Taille d'échantillon</span>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.infoBox}>
            Les participants seront répartis de manière aléatoire et égale dans chacune des conditions expérimentales.
          </div>
          <div className="form-group">
            <label className="form-label">Nombre de participants cible (N total)</label>
            <input
              className="form-input"
              type="number"
              min={1}
              style={{ maxWidth: 140 }}
              value={targetNLocal ?? design.targetN}
              onChange={(e) => setTargetNLocal(e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={() => {
                if (targetNLocal !== null && targetNLocal !== '') {
                  updateDesign.mutate({ targetN: Number(targetNLocal) || 30 })
                }
                setTargetNLocal(null)
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Aperçu de la matrice ───────────────────────────────────────────── */}
      <DesignMatrixPreview studyId={studyId} design={design} />

    </div>
  )
}

// ─── FACTOR EDITOR ───────────────────────────────────────────────────────────

function FactorEditor({ factor, blocks, designType, onUpdateFactor, onDeleteFactor, onAddLevel, onUpdateLevel, onDeleteLevel }) {
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(factor.name)

  const blockOptions = (blocks || []).map((b) => ({
    id: b.id,
    label: b.settings?.name || b.label || `${b.type} #${b.order + 1}`,
  }))

  return (
    <div className={styles.factorCard}>
      <div className={styles.factorHeader}>
        {editingName ? (
          <input
            className="form-input"
            style={{ fontSize: 13, flex: 1, padding: '4px 8px' }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { onUpdateFactor({ name }); setEditingName(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onUpdateFactor({ name }); setEditingName(false) } }}
            autoFocus
          />
        ) : (
          <span className={styles.factorName} onDoubleClick={() => setEditingName(true)}>
            {factor.name}
          </span>
        )}

        <span className={`${styles.factorTypeBadge} ${factor.type === 'BETWEEN' ? styles.factorTypeBetween : styles.factorTypeWithin}`}>
          {factor.type === 'BETWEEN' ? 'Inter' : 'Intra'}
        </span>

        {designType === 'MIXED' && (
          <select
            className="form-input"
            style={{ width: 'auto', fontSize: 11, padding: '2px 6px' }}
            value={factor.type}
            onChange={(e) => onUpdateFactor({ type: e.target.value })}
          >
            <option value="BETWEEN">Inter-sujet</option>
            <option value="WITHIN">Intra-sujet</option>
          </select>
        )}

        <button className={styles.removeBtn} onClick={onDeleteFactor} title="Supprimer le facteur">✕</button>
      </div>

      <div className={styles.factorBody}>
        {/* Header des niveaux */}
        <div className={styles.levelHeader}>
          <span style={{ width: 70 }}>Code</span>
          <span style={{ width: 140 }}>Nom</span>
          <span style={{ flex: 1 }}>Blocs liés</span>
          <span style={{ width: 24 }} />
        </div>

        {/* Niveaux existants */}
        {factor.levels.map((level) => (
          <LevelRow
            key={level.id}
            level={level}
            blockOptions={blockOptions}
            onUpdate={(data) => onUpdateLevel(level.id, data)}
            onDelete={() => onDeleteLevel(level.id)}
          />
        ))}

        {/* Ajouter un niveau */}
        <NewLevelRow onAdd={onAddLevel} />
      </div>
    </div>
  )
}

// ─── LEVEL ROW ───────────────────────────────────────────────────────────────

function LevelRow({ level, blockOptions, onUpdate, onDelete }) {
  const [name, setName] = useState(level.name)
  const [code, setCode] = useState(level.code)
  const bIds = Array.isArray(level.blockIds) ? level.blockIds : JSON.parse(level.blockIds || '[]')

  const handleBlockToggle = (blockId) => {
    const newIds = bIds.includes(blockId)
      ? bIds.filter((id) => id !== blockId)
      : [...bIds, blockId]
    onUpdate({ blockIds: newIds })
  }

  return (
    <div className={styles.levelRow}>
      <input
        className={`form-input ${styles.levelCode}`}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onBlur={() => onUpdate({ code })}
        placeholder="Code"
        style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}
      />
      <input
        className={`form-input ${styles.levelName}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => onUpdate({ name })}
        placeholder="Nom du niveau"
        style={{ fontSize: 12 }}
      />
      <div className={styles.levelBlocks}>
        <select
          className={`form-input ${styles.levelBlocksSelect}`}
          multiple
          value={bIds}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, (o) => o.value)
            onUpdate({ blockIds: selected })
          }}
        >
          {blockOptions.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
      </div>
      <button className={styles.removeBtn} onClick={onDelete}>✕</button>
    </div>
  )
}

function NewLevelRow({ onAdd }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  const handleAdd = () => {
    if (!name.trim() || !code.trim()) return
    onAdd({ name: name.trim(), code: code.trim() })
    setName('')
    setCode('')
  }

  return (
    <div className={styles.levelRow} style={{ opacity: 0.7 }}>
      <input
        className={`form-input ${styles.levelCode}`}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code"
        style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <input
        className={`form-input ${styles.levelName}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nouveau niveau…"
        style={{ fontSize: 12 }}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <button className={styles.addBtn} onClick={handleAdd} style={{ flex: 1 }}>+ Ajouter</button>
      <span style={{ width: 24 }} />
    </div>
  )
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function countCells(factors) {
  const betweenFactors = factors.filter((f) => f.type === 'BETWEEN')
  if (betweenFactors.length === 0) return 1
  return betweenFactors.reduce((acc, f) => acc * Math.max(1, f.levels.length), 1)
}
