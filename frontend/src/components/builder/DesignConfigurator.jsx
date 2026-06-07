import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { Tooltip, Toggle } from './FormWidgets'
import DesignMatrixPreview from './DesignMatrixPreview'
import styles from './DesignConfigurator.module.css'

const DESIGN_TYPES = [
  { value: 'NONE',    label: 'Pas expérimental', icon: '∅', desc: 'Aucun facteur ni manipulation' },
  { value: 'BETWEEN', label: 'Inter-sujet',      icon: '||', desc: 'Groupes indépendants' },
  { value: 'WITHIN',  label: 'Intra-sujet',      icon: '⟳', desc: 'Mesures répétées' },
  { value: 'MIXED',   label: 'Mixte',            icon: '⊞', desc: 'Facteurs inter + intra' },
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
    queryClient.invalidateQueries({ queryKey: ['recruitment', studyId] })
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

  // ── Stats de recrutement (compteurs participants commencé / terminé) ─────
  const { data: recruitment } = useQuery({
    queryKey: ['recruitment', studyId],
    queryFn: async () => {
      const { data } = await api.get(`/api/studies/${studyId}/recruitment`)
      return data
    },
    enabled: !!studyId,
  })

  if (isLoading) {
    return <div className={styles.container}><div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 40 }}>Chargement…</div></div>
  }

  // ── Création paresseuse : si aucun design n'existe encore, on en crée un
  // de type NONE dès la première interaction (changement de type, saisie du
  // targetN). Ça permet à l'utilisateur·rice d'arriver sur l'onglet Design
  // et de voir tout de suite la même mise en page que les études existantes.
  const effectiveDesign = design ?? {
    designType: 'NONE',
    targetN: null,
    counterbalanceMethod: 'LATIN_SQUARE',
    factors: [],
  }

  const setDesignType = (newType) => {
    if (design) {
      updateDesign.mutate({ designType: newType })

      // Fix UX : quand on passe en design pur (BETWEEN ou WITHIN), tous
      // les facteurs existants doivent prendre ce type. Sinon, un facteur
      // créé sous l'ancien type reste avec son type d'origine, et :
      //  - la section Contrebalancement reste cachée à tort
      //  - le sélecteur de type de facteur n'apparaît qu'en mode MIXTE,
      //    donc l'utilisateur·rice n'a aucun moyen de corriger
      // Pour MIXED, on laisse les facteurs intacts (l'utilisateur·rice
      // peut alors librement assigner chaque facteur en inter ou intra).
      if (newType === 'BETWEEN' || newType === 'WITHIN') {
        const factorsToConvert = effectiveDesign.factors.filter((f) => f.type !== newType)
        if (factorsToConvert.length > 0) {
          factorsToConvert.forEach((f) => {
            updateFactor.mutate({ factorId: f.id, type: newType })
          })
          toast.success(
            `${factorsToConvert.length} facteur${factorsToConvert.length > 1 ? 's converti' : ' converti'}${factorsToConvert.length > 1 ? 's' : ''} en ${newType === 'WITHIN' ? 'intra-sujet' : 'inter-sujet'}`
          )
        }
      }
    } else {
      createDesign.mutate({ designType: newType })
    }
  }

  const setTargetN = (value) => {
    const v = Number(value) || null
    if (design) updateDesign.mutate({ targetN: v })
    else createDesign.mutate({ designType: 'NONE', targetN: v })
  }

  const isExperimental = effectiveDesign.designType !== 'NONE'
  const hasWithinFactors  = effectiveDesign.factors.some((f) => f.type === 'WITHIN')
  const hasBetweenFactors = effectiveDesign.factors.some((f) => f.type === 'BETWEEN')

  // Déterminer le type de facteur par défaut pour un nouveau facteur
  const getDefaultFactorType = () => {
    if (effectiveDesign.designType === 'BETWEEN') return 'BETWEEN'
    if (effectiveDesign.designType === 'WITHIN')  return 'WITHIN'
    return 'BETWEEN'
  }

  return (
    <div className={styles.container}>

      {/* ── 1. Échantillon : objectif + stats de recrutement ─────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Taille d'échantillon</span>
        </div>
        <div className={styles.sectionBody}>
          <div className="form-group">
            <label className="form-label">Nombre de participants prévus (objectif)</label>
            <input
              className="form-input"
              type="number"
              min={1}
              style={{ maxWidth: 200, minWidth: 120 }}
              placeholder="ex : 250"
              value={targetNLocal ?? effectiveDesign.targetN ?? ''}
              onChange={(e) => setTargetNLocal(e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={() => {
                if (targetNLocal !== null && targetNLocal !== '' &&
                    targetNLocal !== effectiveDesign.targetN) {
                  setTargetN(targetNLocal)
                }
                setTargetNLocal(null)
              }}
            />
          </div>

          {/* Stats de recrutement (commence à apparaître dès qu'au moins
              un participant a démarré l'étude) */}
          {recruitment && recruitment.started > 0 && (
            <RecruitmentStats stats={recruitment} />
          )}
        </div>
      </div>

      {/* ── 2. Type de design ────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Type de design</span>
          {design && isExperimental && (
            <button className={styles.deleteDesignBtn} onClick={() => {
              if (confirm('Repasser cette étude en « Pas expérimental » supprimera les facteurs et niveaux. Continuer ?')) {
                deleteDesign.mutate()
              }
            }}>Supprimer les facteurs</button>
          )}
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.typeGrid}>
            {DESIGN_TYPES.map((t) => (
              <div
                key={t.value}
                className={`${styles.typeCard} ${effectiveDesign.designType === t.value ? styles.typeCardActive : ''}`}
                onClick={() => setDesignType(t.value)}
              >
                <div className={styles.typeIcon}>{t.icon}</div>
                <div className={styles.typeName}>{t.label}</div>
                <div className={styles.typeDesc}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Facteurs (uniquement si étude expérimentale) ──────────────── */}
      {isExperimental && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              Facteurs ({effectiveDesign.factors.length})
              <Tooltip text="Chaque facteur représente une variable indépendante. Ajoutez des niveaux à chaque facteur, puis liez-les aux blocs de l'étude." />
            </span>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.factorList}>
              {effectiveDesign.factors.map((factor) => (
                <FactorEditor
                  key={factor.id}
                  factor={factor}
                  blocks={blocks}
                  designType={effectiveDesign.designType}
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
      )}

      {/* ── Contrebalancement (si intra-sujet) ───────────────────────────── */}
      {isExperimental && hasWithinFactors && (
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
                  className={`${styles.methodCard} ${effectiveDesign.counterbalanceMethod === m.value ? styles.methodCardActive : ''}`}
                  onClick={() => updateDesign.mutate({ counterbalanceMethod: m.value })}
                >
                  <div className={styles.methodName}>{m.label}</div>
                  <div className={styles.methodDesc}>{m.desc}</div>
                </div>
              ))}
            </div>

            {effectiveDesign.counterbalanceMethod !== 'RANDOM' && hasWithinFactors && (
              <div className={styles.infoBox}>
                {effectiveDesign.counterbalanceMethod === 'LATIN_SQUARE'
                  ? `Carré latin : ${effectiveDesign.factors.find(f => f.type === 'WITHIN')?.levels.length || '?'} ordres de présentation, assignés cycliquement aux participants.`
                  : `Williams : séquences équilibrées où chaque condition est précédée par chaque autre exactement une fois.`
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Aperçu de la matrice (uniquement si étude expérimentale) ──── */}
      {isExperimental && design && (
        <DesignMatrixPreview studyId={studyId} design={design} />
      )}

    </div>
  )
}

// ─── STATS DE RECRUTEMENT ─────────────────────────────────────────────────────
//
// Affiche dans la section « Taille d'échantillon » :
//   - Une barre de progression (n complétions / N objectif) si N est défini
//   - Le nombre de participants ayant commencé / terminé
//   - Le taux de complétion (terminé / commencé)

function RecruitmentStats({ stats }) {
  const { started, completed, completionRate, targetN, progress } = stats
  const pctCompletion = completionRate !== null ? Math.round(completionRate * 100) : null
  const pctProgress   = progress !== null ? Math.round(progress * 100) : null

  return (
    <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--gray-200)' }}>
      {/* Barre de progression vers l'objectif */}
      {targetN !== null && targetN > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--gray-700)' }}>
              Progression du recrutement
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
              {completed} / {targetN} ({pctProgress} %)
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--gray-200)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              width: `${pctProgress}%`,
              height: '100%',
              background: 'var(--brand)',
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Compteurs détaillés */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 24px', fontSize: 13 }}>
        <span style={{ color: 'var(--gray-700)' }}>Participants ayant commencé l'étude</span>
        <span style={{ fontWeight: 600, color: 'var(--navy)', textAlign: 'right' }}>{started}</span>

        <span style={{ color: 'var(--gray-700)' }}>Participants ayant terminé l'étude</span>
        <span style={{ fontWeight: 600, color: 'var(--navy)', textAlign: 'right' }}>{completed}</span>

        {pctCompletion !== null && (
          <>
            <span style={{ color: 'var(--gray-700)' }}>Taux de complétion</span>
            <span style={{ fontWeight: 600, color: 'var(--navy)', textAlign: 'right' }}>{pctCompletion} %</span>
          </>
        )}
      </div>
    </div>
  )
}

// ─── FACTOR EDITOR ───────────────────────────────────────────────────────────

function FactorEditor({ factor, blocks, designType, onUpdateFactor, onDeleteFactor, onAddLevel, onUpdateLevel, onDeleteLevel }) {
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(factor.name)

  const BLOCK_TYPE_LABELS = {
    WELCOME: "Message d'accueil",
    INSTRUCTION: 'Instruction',
    QUESTION: 'Questionnaire',
    STIMULUS: 'Tâche',
    LOGIC: 'Logique',
    DEBRIEFING: 'Message de fin',
  }

  const blockOptions = (blocks || []).map((b) => ({
    id: b.id,
    label: b.settings?.name || b.label || `${BLOCK_TYPE_LABELS[b.type] || b.type} #${b.order + 1}`,
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
        <div className={styles.blockCheckList}>
          {blockOptions.map((b) => {
            const checked = bIds.includes(b.id)
            return (
              <label key={b.id} className={`${styles.blockCheckItem} ${checked ? styles.blockCheckItemActive : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleBlockToggle(b.id)}
                  className={styles.blockCheckbox}
                />
                <span className={styles.blockCheckLabel}>{b.label}</span>
              </label>
            )
          })}
        </div>
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
