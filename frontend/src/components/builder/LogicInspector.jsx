import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { Tooltip } from './FormWidgets'
import styles from './LogicInspector.module.css'
import inspectorStyles from './BlockInspector.module.css'

const RULE_TYPES = [
  { value: 'CONDITION_ASSIGNMENT', label: 'Condition expérimentale' },
  { value: 'RESPONSE_VALUE', label: 'Réponse du participant' },
]

const OPERATORS = {
  CONDITION_ASSIGNMENT: [
    { value: 'EQUALS', label: 'est assigné à' },
    { value: 'NOT_EQUALS', label: 'n\'est PAS assigné à' },
  ],
  RESPONSE_VALUE: [
    { value: 'EQUALS', label: '=' },
    { value: 'NOT_EQUALS', label: '≠' },
    { value: 'GREATER_THAN', label: '>' },
    { value: 'LESS_THAN', label: '<' },
    { value: 'CONTAINS', label: 'contient' },
  ],
}

const ACTIONS = [
  { value: 'CONTINUE', label: 'Continuer' },
  { value: 'SKIP_NEXT', label: 'Sauter le bloc suivant' },
  { value: 'JUMP_TO', label: 'Aller au bloc…' },
  { value: 'END_STUDY', label: 'Terminer l\'étude' },
]

const BLOCK_TYPE_FR = {
  WELCOME: "Message d'accueil",
  INSTRUCTION: 'Instruction',
  QUESTION: 'Questionnaire',
  STIMULUS: 'Tâche',
  LOGIC: 'Logique',
  DEBRIEFING: 'Message de fin',
}

export default function LogicInspector({ block, studyId, onSave }) {
  const [settings, setSettings] = useState(block.settings || { rules: [], defaultAction: 'CONTINUE' })

  useEffect(() => {
    setSettings(block.settings || { rules: [], defaultAction: 'CONTINUE' })
  }, [block.id])

  // Charger l'étude pour avoir la liste des blocs et le design
  const { data: studyData } = useQuery({
    queryKey: ['study', studyId],
    queryFn: async () => { const { data } = await api.get(`/api/studies/${studyId}`); return data },
    enabled: !!studyId,
  })

  const study = studyData?.study
  const allBlocks = study?.blocks || []
  const design = study?.design

  // Collecter toutes les questions de l'étude (avec leurs choix éventuels)
  // pour pouvoir, plus bas, proposer un dropdown de valeurs attendues quand
  // la question est à choix ou de type Likert (évite les fautes de frappe).
  const allQuestions = allBlocks
    .filter((b) => b.type === 'QUESTION')
    .flatMap((b) => b.questions || [])
    .filter((q) => q.code) // ignorer les questions sans code (pas référençables)

  /**
   * Pour une question donnée, renvoie la liste des codes/labels possibles
   * pour la « Valeur attendue » dans une règle, ou null si la question
   * accepte une saisie libre (texte, numérique, date, etc.).
   */
  const getValueOptions = (question) => {
    if (!question) return null
    // Questions à choix : les codes viennent du tableau choices[]
    const CHOICE_TYPES = [
      'RADIO', 'SELECT', 'BUTTON_GROUP', 'MEDIA_RADIO', 'RADIO_COMMENT',
      'CHECKBOX', 'MEDIA_CHECKBOX', 'CHECKBOX_COMMENT', 'DRILL_DOWN',
    ]
    if (CHOICE_TYPES.includes(question.type) && Array.isArray(question.choices)) {
      return question.choices
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((c) => ({ value: c.code, label: c.label || c.code }))
    }
    // Likert : codes = entiers de startFrom à startFrom + points - 1
    if (question.type === 'LIKERT') {
      const points = question.settings?.points || 5
      const startFrom = question.settings?.startFrom ?? 1
      const labels = question.settings?.pointLabels || []
      return Array.from({ length: points }, (_, i) => {
        const n = i + startFrom
        return { value: String(n), label: labels[i] ? `${n} — ${labels[i]}` : String(n) }
      })
    }
    // Consent : oui / non
    if (question.type === 'CONSENT') {
      return [
        { value: 'true', label: 'true (accepte)' },
        { value: 'false', label: 'false (refuse)' },
      ]
    }
    // Tous les autres types (TEXT, NUMERIC, DATE, SLIDER, MATRIX,
    // SEMANTIC_DIFF, SIDE_BY_SIDE, FILE_UPLOAD, RANKING, etc.) acceptent
    // une saisie libre ou une valeur composite → on garde l'input texte
    return null
  }

  // Collecter les facteurs et niveaux du design
  const factors = design?.factors || []

  const rules = settings.rules || []

  const updateRule = (index, field, value) => {
    const newRules = [...rules]
    newRules[index] = { ...newRules[index], [field]: value }
    const newSettings = { ...settings, rules: newRules }
    setSettings(newSettings)
  }

  const addRule = () => {
    const newRule = {
      id: `rule_${Date.now()}`,
      type: 'RESPONSE_VALUE',
      sourceQuestionCode: '',
      operator: 'EQUALS',
      value: '',
      action: 'SKIP_NEXT',
      targetBlockId: null,
    }
    const newSettings = { ...settings, rules: [...rules, newRule] }
    setSettings(newSettings)
  }

  const removeRule = (index) => {
    const newSettings = { ...settings, rules: rules.filter((_, i) => i !== index) }
    setSettings(newSettings)
  }

  const handleSave = () => {
    // On merge avec block.settings actuel pour ne pas écraser les autres
    // champs gérés ailleurs (par ex. settings.name modifié dans le header
    // de l'inspecteur, ou settings.randomGroup). Sans ce merge, le state
    // local — initialisé au montage — pouvait écraser des modifs faites
    // entre-temps via d'autres interfaces.
    onSave(block.id, { ...block.settings, ...settings })
  }

  return (
    <div className={styles.body}>
      <div className={styles.infoBox}>
        Les règles sont évaluées dans l'ordre. La première règle qui correspond est appliquée.
        Si aucune règle ne correspond, l'action par défaut est utilisée.
      </div>

      {/* ── Règles ───────────────────────────────────────────────────────────── */}
      {rules.map((rule, i) => (
        <div key={rule.id || i} className={styles.ruleCard}>
          <div className={styles.ruleHeader}>
            <span>Règle {i + 1}</span>
            <button className={styles.removeBtn} onClick={() => removeRule(i)}>✕</button>
          </div>
          <div className={styles.ruleBody}>
            {/* Type de condition */}
            <div className={styles.ruleRow}>
              <span className={styles.ruleLabel}>Si</span>
              <select
                className={`form-input ${styles.ruleSelect}`}
                value={rule.type}
                onChange={(e) => updateRule(i, 'type', e.target.value)}
                style={{ fontSize: 12 }}
              >
                {RULE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Source */}
            {rule.type === 'RESPONSE_VALUE' && (
              <div className={styles.ruleRow}>
                <span className={styles.ruleLabel}>Code</span>
                <select
                  className={`form-input ${styles.ruleSelect}`}
                  value={rule.sourceQuestionCode || ''}
                  onChange={(e) => updateRule(i, 'sourceQuestionCode', e.target.value)}
                  style={{ fontSize: 12 }}
                >
                  <option value="">Choisir une question…</option>
                  {allQuestions.map((q) => <option key={q.id || q.code} value={q.code}>{q.code}</option>)}
                </select>
              </div>
            )}

            {rule.type === 'CONDITION_ASSIGNMENT' && (
              <div className={styles.ruleRow}>
                <span className={styles.ruleLabel}>Niveau</span>
                <select
                  className={`form-input ${styles.ruleSelect}`}
                  value={rule.levelId || ''}
                  onChange={(e) => updateRule(i, 'levelId', e.target.value)}
                  style={{ fontSize: 12 }}
                >
                  <option value="">Choisir un niveau…</option>
                  {factors.map((f) =>
                    f.levels.map((l) => (
                      <option key={l.id} value={l.id}>{f.name} → {l.name}</option>
                    ))
                  )}
                </select>
              </div>
            )}

            {/* Opérateur + valeur */}
            <div className={styles.ruleRow}>
              <span className={styles.ruleLabel}>Op.</span>
              <select
                className={`form-input`}
                value={rule.operator || 'EQUALS'}
                onChange={(e) => updateRule(i, 'operator', e.target.value)}
                style={{ fontSize: 12, width: 120, flexShrink: 0 }}
              >
                {(OPERATORS[rule.type] || OPERATORS.RESPONSE_VALUE).map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              {rule.type === 'RESPONSE_VALUE' && (() => {
                // Si la question source est à choix (radio, checkbox, likert,
                // consent…), on propose un dropdown des codes valides. Sinon
                // (texte libre, numérique…), input texte classique. Les
                // opérateurs CONTAINS / GREATER_THAN / LESS_THAN gardent
                // l'input texte même si la question est à choix : on peut
                // vouloir taper une sous-chaîne ou un nombre.
                const selectedQ = allQuestions.find((q) => q.code === rule.sourceQuestionCode)
                const opts = getValueOptions(selectedQ)
                const useDropdown = opts && (rule.operator === 'EQUALS' || rule.operator === 'NOT_EQUALS')
                if (useDropdown) {
                  return (
                    <select
                      className={`form-input ${styles.ruleInput}`}
                      value={rule.value || ''}
                      onChange={(e) => updateRule(i, 'value', e.target.value)}
                      style={{ fontSize: 12 }}
                    >
                      <option value="">Choisir une valeur…</option>
                      {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )
                }
                return (
                  <input
                    className={`form-input ${styles.ruleInput}`}
                    value={rule.value || ''}
                    onChange={(e) => updateRule(i, 'value', e.target.value)}
                    placeholder="Valeur attendue"
                    style={{ fontSize: 12 }}
                  />
                )
              })()}
            </div>

            {/* Action */}
            <div className={styles.ruleRow}>
              <span className={styles.ruleLabel}>Alors</span>
              <select
                className={`form-input ${styles.ruleSelect}`}
                value={rule.action || 'CONTINUE'}
                onChange={(e) => updateRule(i, 'action', e.target.value)}
                style={{ fontSize: 12 }}
              >
                {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>

            {/* Cible (si JUMP_TO) */}
            {rule.action === 'JUMP_TO' && (
              <div className={styles.ruleRow}>
                <span className={styles.ruleLabel}>Vers</span>
                <select
                  className={`form-input ${styles.ruleSelect}`}
                  value={rule.targetBlockId || ''}
                  onChange={(e) => updateRule(i, 'targetBlockId', e.target.value)}
                  style={{ fontSize: 12 }}
                >
                  <option value="">Choisir un bloc…</option>
                  {allBlocks.filter((b) => b.id !== block.id).map((b) => (
                    <option key={b.id} value={b.id}>
                      {/* Le nom personnalisé du bloc vit dans b.settings.name
                          (cf. BlockCanvas, DesignConfigurator). Sans ce
                          fallback on affichait toujours « QUESTION #1 » même
                          quand l'utilisateur avait nommé le bloc. */}
                      {b.settings?.name || b.label || `${BLOCK_TYPE_FR[b.type] || b.type} #${b.order + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      ))}

      <button className={styles.addBtn} onClick={addRule}>+ Ajouter une règle</button>

      {/* ── Action par défaut ─────────────────────────────────────────────── */}
      <div className={styles.defaultRow}>
        <span className={styles.defaultLabel}>
          Action par défaut
          <Tooltip text="Action appliquée si aucune règle ne correspond." />
        </span>
        <select
          className="form-input"
          value={settings.defaultAction || 'CONTINUE'}
          onChange={(e) => setSettings({ ...settings, defaultAction: e.target.value })}
          style={{ width: 'auto', fontSize: 12 }}
        >
          {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>

      {/* ── Cible de l'action par défaut (si JUMP_TO) ─────────────────────
        Bug 8a (issue #83) : si on choisissait « Aller au bloc... » comme
        action par défaut, aucun sélecteur de bloc n'apparaissait — donc
        impossible de configurer cette redirection. Le sélecteur ci-dessous
        comble ce vide. Le bloc choisi est stocké dans
        settings.defaultTargetBlockId et utilisé par l'évaluateur de
        logique côté backend. */}
      {settings.defaultAction === 'JUMP_TO' && (
        <div className={styles.defaultRow}>
          <span className={styles.defaultLabel}>Vers</span>
          <select
            className="form-input"
            value={settings.defaultTargetBlockId || ''}
            onChange={(e) => setSettings({ ...settings, defaultTargetBlockId: e.target.value })}
            style={{ width: 'auto', fontSize: 12 }}
          >
            <option value="">Choisir un bloc…</option>
            {allBlocks.filter((b) => b.id !== block.id).map((b) => (
              <option key={b.id} value={b.id}>
                {b.settings?.name || b.label || `${BLOCK_TYPE_FR[b.type] || b.type} #${b.order + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Sauvegarder ──────────────────────────────────────────────────── */}
      <button
        className="btn btn-primary"
        style={{ width: '100%' }}
        onClick={handleSave}
      >
        Sauvegarder la logique
      </button>
    </div>
  )
}
