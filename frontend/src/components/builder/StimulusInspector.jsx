import { useState, useRef, useEffect } from 'react'
import api from '../../lib/api'
import styles from './StimulusInspector.module.css'

// ─── ÉTAPES D'UN ESSAI ────────────────────────────────────────────────────────

const STEP_TYPES = [
  { type: 'INSTRUCTION_PAGE', label: 'Page d\'instruction',  color: 'purple', desc: 'Texte + bouton pour continuer' },
  { type: 'WAIT_KEY',         label: 'Attente active',       color: 'gray',   desc: 'Symbole + touche pour démarrer' },
  { type: 'FIXATION',         label: 'Croix de fixation',    color: 'gray',   desc: '+ affiché pendant X ms' },
  { type: 'BLANK',            label: 'Écran vide',           color: 'gray',   desc: 'Pause entre étapes' },
  { type: 'STIMULUS',         label: 'Stimulus',             color: 'teal',   desc: 'Image / vidéo / audio' },
  { type: 'RESPONSE_KEY',     label: 'Réponse clavier + RT', color: 'coral',  desc: 'Capture touche + temps de réaction' },
  { type: 'FEEDBACK',         label: 'Feedback',             color: 'amber',  desc: 'Correct / incorrect / timeout' },
  { type: 'QUESTION',         label: 'Question post-essai',  color: 'blue',   desc: 'Likert, slider, choix…' },
  { type: 'ITI',              label: 'ITI',                  color: 'gray',   desc: 'Inter-trial interval' },
]

// ─── PHASES DE LA TÂCHE ───────────────────────────────────────────────────────

const PHASE_TYPES = [
  { type: 'INSTRUCTION', label: 'Instruction',            color: 'purple', desc: 'Texte + bouton pour continuer' },
  { type: 'TRAINING',    label: 'Bloc d\'entraînement', color: 'amber',  desc: 'Essais de pratique (non enregistrés)' },
  { type: 'TEST',        label: 'Bloc de test',           color: 'teal',   desc: 'Essais expérimentaux enregistrés' },
  { type: 'PAUSE',       label: 'Pause',                  color: 'gray',   desc: 'Écran de repos entre blocs' },
]

const COLOR_MAP = {
  purple: { bg: '#EEEDFE', text: '#3C3489' },
  teal:   { bg: '#E1F5EE', text: '#085041' },
  coral:  { bg: '#FAECE7', text: '#712B13' },
  amber:  { bg: '#FAEEDA', text: '#633806' },
  blue:   { bg: '#E6F1FB', text: '#0C447C' },
  gray:   { bg: '#F1EFE8', text: '#444441' },
}

// ─── CHAMP DURÉE MIN/MAX + PALIERS ───────────────────────────────────────────

function DurationField({ label, minKey, maxKey, settings, onChange, tooltip }) {
  const stepKey = minKey.replace(/Min$/, 'Step')
  const min = settings[minKey] ?? ''
  const max = settings[maxKey] ?? ''
  const step = settings[stepKey] ?? ''

  const isRange = max !== '' && Number(max) !== Number(min)

  // Build hint text
  let hint = ''
  if (!isRange && min !== '') hint = `Fixe : ${min} ms`
  else if (isRange && step === '') hint = `Continu entre ${min} et ${max} ms (toute valeur possible)`
  else if (isRange && step !== '') {
    const vals = []
    for (let v = Number(min); v <= Number(max) && vals.length < 6; v += Number(step)) vals.push(v)
    hint = `Paliers : ${vals.join(', ')}${Number(min) + vals.length * Number(step) <= Number(max) ? '…' : ''} ms`
  }

  return (
    <div className={styles.durationField}>
      <div className={styles.durationLabel}>
        {label}
        {tooltip && <span className={styles.tip} title={tooltip}>?</span>}
      </div>
      <div className={styles.durationInputs}>
        <input
          className={styles.durationInput}
          type="number" min={0}
          value={min}
          onChange={(e) => onChange({ [minKey]: Number(e.target.value) })}
          placeholder="ms"
        />
        <span className={styles.durationSep}>–</span>
        <input
          className={styles.durationInput}
          type="number" min={0}
          value={max}
          onChange={(e) => onChange({ [maxKey]: Number(e.target.value) })}
          placeholder="max ms"
        />
      </div>
      {isRange && (
        <div className={styles.durationStepRow}>
          <span className={styles.durationStepLabel}>Palier (ms) :</span>
          <input
            className={styles.durationInput}
            type="number" min={1}
            value={step}
            onChange={(e) => {
              const v = e.target.value
              onChange({ [stepKey]: v === '' ? undefined : Number(v) })
            }}
            placeholder="vide = continu"
            style={{ width: 110 }}
          />
        </div>
      )}
      {hint && <div className={styles.durationHint}>{hint}</div>}
    </div>
  )
}

// ─── ÉDITEUR D'ÉTAPE (essai) ──────────────────────────────────────────────────

function StepEditor({ step, onUpdate, onClose }) {
  const [s, setS] = useState(step.settings || {})
  const upd = (patch) => setS((p) => ({ ...p, ...patch }))
  const bgFileRef = useRef()

  const uploadBg = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const { data } = await api.post('/api/media/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
      upd({ background: data.url?.startsWith('/') ? `${apiBase}${data.url}` : data.url })
    } catch {}
    e.target.value = ''
  }

  const save = () => { onUpdate({ ...step, settings: s }); onClose() }

  // Pour QUESTION : gestion inline des choix RADIO
  const addChoice = () => upd({ choices: [...(s.choices || []), { label: '' }] })
  const removeChoice = (i) => upd({ choices: (s.choices || []).filter((_, j) => j !== i) })
  const updateChoice = (i, val) => {
    const ch = [...(s.choices || [])]
    ch[i] = { ...ch[i], label: val }
    upd({ choices: ch })
  }

  return (
    <div className={styles.stepEditorOverlay}>
      <div className={styles.stepEditor}>
        <div className={styles.stepEditorHeader}>
          <span className={styles.stepEditorTitle}>Configurer — {STEP_TYPES.find(t => t.type === step.type)?.label}</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.stepEditorBody}>

          {step.type === 'INSTRUCTION_PAGE' && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Texte d'instruction</label>
                <textarea className={styles.fieldTextarea} rows={4} value={s.text || ''} onChange={(e) => upd({ text: e.target.value })} placeholder="Ex : Appuyez sur F si l'image est positive, sur J si elle est négative." />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Libellé du bouton</label>
                <input className={styles.fieldInput} value={s.buttonLabel || 'Commencer'} onChange={(e) => upd({ buttonLabel: e.target.value })} />
              </div>
            </>
          )}

          {step.type === 'WAIT_KEY' && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Symbole affiché</label>
                <input className={styles.fieldInput} value={s.symbol || '●'} onChange={(e) => upd({ symbol: e.target.value })} placeholder="ex: ● ou Prêt ?" />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Touche pour démarrer</label>
                <input className={styles.fieldInput} value={s.key || 'Space'} onChange={(e) => upd({ key: e.target.value })} placeholder="ex: Space, Enter" />
              </div>
            </>
          )}

          {step.type === 'FIXATION' && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Symbole de fixation</label>
                <input className={styles.fieldInput} value={s.symbol || '+'} onChange={(e) => upd({ symbol: e.target.value })} />
              </div>
              <DurationField label="Durée" minKey="durationMin" maxKey="durationMax" settings={s} onChange={upd} tooltip="Si min ≠ max, la durée est tirée aléatoirement dans la plage" />
            </>
          )}

          {step.type === 'BLANK' && (
            <DurationField label="Durée" minKey="durationMin" maxKey="durationMax" settings={s} onChange={upd} tooltip="Écran vide pendant cette durée" />
          )}

          {step.type === 'STIMULUS' && (
            <>
              <DurationField label="Durée d'affichage (0 = jusqu'à réponse)" minKey="durationMin" maxKey="durationMax" settings={s} onChange={upd} tooltip="0 = le stimulus reste affiché jusqu'à ce que le participant réponde" />
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Image de fond</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className={styles.fieldInput} value={s.background || ''} onChange={(e) => upd({ background: e.target.value })} placeholder="URL ou charger un fichier" />
                  <button className={styles.uploadInlineBtn} onClick={() => bgFileRef.current.click()} title="Choisir un fichier">📁</button>
                  <input ref={bgFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadBg} />
                </div>
                {s.background && <img src={s.background} alt="aperçu" style={{ maxHeight: 60, borderRadius: 4, marginTop: 4, objectFit: 'contain' }} />}
              </div>
              <div className={styles.toggleRow}>
                <span className={styles.fieldLabel}>Zoom selon la réponse du participant</span>
                <div className={`${styles.toggle} ${s.responseZoom ? styles.toggleOn : ''}`} onClick={() => upd({ responseZoom: !s.responseZoom })} />
              </div>
              {s.responseZoom && (
                <>
                  <div className={styles.twoCol}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Facteur approche (×)</label>
                      <input className={styles.fieldInput} type="number" step="0.1" min="0.1" value={s.approachFactor ?? 1.5} onChange={(e) => upd({ approachFactor: Number(e.target.value) })} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Facteur évitement (×)</label>
                      <input className={styles.fieldInput} type="number" step="0.1" min="0.1" value={s.avoidFactor ?? 0.5} onChange={(e) => upd({ avoidFactor: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Durée de l'animation (ms)</label>
                    <input className={styles.fieldInput} type="number" min={50} value={s.zoomDuration ?? 300} onChange={(e) => upd({ zoomDuration: Number(e.target.value) })} />
                  </div>
                  <div className={styles.infoBox}>
                    La touche mappée comme "approche" déclenche un zoom avant (×{s.approachFactor ?? 1.5}), la touche "évitement" un zoom arrière (×{s.avoidFactor ?? 0.5}). Configurez le mapping dans l'étape <strong>Réponse clavier</strong>.
                  </div>
                </>
              )}
            </>
          )}

          {step.type === 'RESPONSE_KEY' && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Fenêtre de réponse max (ms, 0 = illimitée)</label>
                <input className={styles.fieldInput} type="number" value={s.maxResponseTime ?? ''} onChange={(e) => upd({ maxResponseTime: e.target.value === '' ? null : Number(e.target.value) })} onBlur={() => { if (!s.maxResponseTime) upd({ maxResponseTime: 2000 }) }} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Mapping des touches</label>
                <div className={styles.keyMapList}>
                  {(s.keyMap || [{ key: 'KeyF', label: 'Catégorie A', correct: true }, { key: 'KeyJ', label: 'Catégorie B', correct: false }]).map((km, i) => (
                    <div key={i} className={styles.keyMapRow}>
                      <input
                        className={styles.keyInput}
                        value={km.key}
                        onChange={(e) => {
                          const m = [...(s.keyMap || [])]
                          m[i] = { ...m[i], key: e.target.value }
                          upd({ keyMap: m })
                        }}
                        placeholder="KeyF"
                      />
                      <span className={styles.keyArrow}>→</span>
                      <input
                        className={`${styles.fieldInput} ${styles.keyLabel}`}
                        value={km.label}
                        onChange={(e) => {
                          const m = [...(s.keyMap || [])]
                          m[i] = { ...m[i], label: e.target.value }
                          upd({ keyMap: m })
                        }}
                        placeholder="Libellé / catégorie"
                      />
                    </div>
                  ))}
                  <button className={styles.addKeyBtn} onClick={() => {
                    const m = [...(s.keyMap || [])]
                    m.push({ key: '', label: '' })
                    upd({ keyMap: m })
                  }}>+ Ajouter une touche</button>
                </div>
                <div className={styles.infoBox} style={{marginTop:8}}>
                  Codes touches : <code>KeyF</code>, <code>KeyJ</code>, <code>Space</code>, <code>ArrowLeft</code>, <code>ArrowRight</code>…
                </div>
              </div>
            </>
          )}

          {step.type === 'FEEDBACK' && (
            <>
              <div className={styles.twoCol}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Réponse correcte</label>
                  <input className={styles.fieldInput} value={s.correctText || '✓'} onChange={(e) => upd({ correctText: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Réponse incorrecte</label>
                  <input className={styles.fieldInput} value={s.incorrectText || '✗'} onChange={(e) => upd({ incorrectText: e.target.value })} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Pas de réponse (timeout)</label>
                <input className={styles.fieldInput} value={s.timeoutText || 'Trop lent !'} onChange={(e) => upd({ timeoutText: e.target.value })} />
              </div>
              <DurationField label="Durée d'affichage" minKey="durationMin" maxKey="durationMax" settings={s} onChange={upd} />
            </>
          )}

          {step.type === 'QUESTION' && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Texte de la question</label>
                <input className={styles.fieldInput} value={s.text || ''} onChange={(e) => upd({ text: e.target.value })} placeholder="Ex : Comment vous sentez-vous après cet essai ?" />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Type de réponse</label>
                <select className={styles.fieldSelect} value={s.responseType || 'RADIO'} onChange={(e) => upd({ responseType: e.target.value })}>
                  <option value="RADIO">Choix unique (boutons radio)</option>
                  <option value="LIKERT">Échelle de Likert</option>
                  <option value="SLIDER">Slider</option>
                  <option value="TEXT">Texte libre</option>
                  <option value="NUMERIC">Numérique</option>
                </select>
              </div>

              {(s.responseType === 'RADIO' || !s.responseType) && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Choix de réponse</label>
                  <div className={styles.keyMapList}>
                    {(s.choices || [{ label: 'Oui' }, { label: 'Non' }]).map((ch, i) => (
                      <div key={i} className={styles.keyMapRow}>
                        <input
                          className={`${styles.fieldInput} ${styles.keyLabel}`}
                          value={ch.label}
                          onChange={(e) => updateChoice(i, e.target.value)}
                          placeholder={`Choix ${i + 1}`}
                        />
                        <button className={styles.stepBtnDanger} style={{border:'none',background:'none',cursor:'pointer',padding:'2px 6px',color:'#999'}} onClick={() => removeChoice(i)}>✕</button>
                      </div>
                    ))}
                    <button className={styles.addKeyBtn} onClick={addChoice}>+ Ajouter un choix</button>
                  </div>
                </div>
              )}

              {s.responseType === 'LIKERT' && (
                <div className={styles.twoCol}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Nombre de points</label>
                    <input className={styles.fieldInput} type="number" min={2} max={11} value={s.points ?? ''} onChange={(e) => upd({ points: e.target.value === '' ? null : Number(e.target.value) })} onBlur={() => { if (!s.points) upd({ points: 5 }) }} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Label gauche</label>
                    <input className={styles.fieldInput} value={s.leftLabel || ''} onChange={(e) => upd({ leftLabel: e.target.value })} placeholder="Pas du tout" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Label droite</label>
                    <input className={styles.fieldInput} value={s.rightLabel || ''} onChange={(e) => upd({ rightLabel: e.target.value })} placeholder="Tout à fait" />
                  </div>
                </div>
              )}

              {s.responseType === 'SLIDER' && (
                <div className={styles.twoCol}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Min</label>
                    <input className={styles.fieldInput} type="number" value={s.min ?? 0} onChange={(e) => upd({ min: Number(e.target.value) })} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Max</label>
                    <input className={styles.fieldInput} type="number" value={s.max ?? 100} onChange={(e) => upd({ max: Number(e.target.value) })} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Label gauche</label>
                    <input className={styles.fieldInput} value={s.leftLabel || ''} onChange={(e) => upd({ leftLabel: e.target.value })} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Label droite</label>
                    <input className={styles.fieldInput} value={s.rightLabel || ''} onChange={(e) => upd({ rightLabel: e.target.value })} />
                  </div>
                </div>
              )}

              {s.responseType === 'NUMERIC' && (
                <div className={styles.twoCol}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Min (optionnel)</label>
                    <input className={styles.fieldInput} type="number" value={s.min ?? ''} onChange={(e) => upd({ min: e.target.value === '' ? undefined : Number(e.target.value) })} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Max (optionnel)</label>
                    <input className={styles.fieldInput} type="number" value={s.max ?? ''} onChange={(e) => upd({ max: e.target.value === '' ? undefined : Number(e.target.value) })} />
                  </div>
                </div>
              )}

              <div className={styles.toggleRow}>
                <span className={styles.fieldLabel}>Réponse obligatoire</span>
                <div className={`${styles.toggle} ${s.required !== false ? styles.toggleOn : ''}`} onClick={() => upd({ required: !(s.required !== false) })} />
              </div>
            </>
          )}

          {step.type === 'ITI' && (
            <DurationField label="Durée ITI" minKey="durationMin" maxKey="durationMax" settings={s} onChange={upd} tooltip="Pause entre deux essais. Si min ≠ max, durée aléatoire." />
          )}

        </div>
        <div className={styles.stepEditorFooter}>
          <button className={styles.btnSecondary} onClick={onClose}>Annuler</button>
          <button className={styles.btnPrimary} onClick={save}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

// ─── ÉDITEUR DE PHASE (structure tâche) ──────────────────────────────────────

function PhaseEditor({ phase, onUpdate, onClose }) {
  const [s, setS] = useState(phase.settings || {})
  const upd = (patch) => setS((p) => ({ ...p, ...patch }))
  const save = () => { onUpdate({ ...phase, settings: s }); onClose() }

  const def = PHASE_TYPES.find(t => t.type === phase.type) || PHASE_TYPES[0]

  return (
    <div className={styles.stepEditorOverlay}>
      <div className={styles.stepEditor}>
        <div className={styles.stepEditorHeader}>
          <span className={styles.stepEditorTitle}>Configurer — {def.label}</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.stepEditorBody}>

          {phase.type === 'INSTRUCTION' && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nom (affiché dans la structure)</label>
                <input className={styles.fieldInput} value={s.name || ''} onChange={(e) => upd({ name: e.target.value })} placeholder="Ex : Instruction générale, Rappel des consignes…" />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Texte affiché au participant</label>
                <textarea className={styles.fieldTextarea} rows={5} value={s.text || ''} onChange={(e) => upd({ text: e.target.value })} placeholder="Contenu de l'instruction (HTML accepté)…" />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Libellé du bouton</label>
                <input className={styles.fieldInput} value={s.buttonLabel || 'Continuer'} onChange={(e) => upd({ buttonLabel: e.target.value })} />
              </div>
            </>
          )}

          {phase.type === 'TRAINING' && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nom (affiché dans la structure)</label>
                <input className={styles.fieldInput} value={s.name || "Bloc d'entraînement"} onChange={(e) => upd({ name: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nombre d'essais d'entraînement</label>
                <input className={styles.fieldInput} type="number" min={1} value={s.trialCount ?? ''} placeholder="nombre d'essais" onChange={(e) => upd({ trialCount: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </div>
              <div className={styles.infoBox}>
                Les essais d'entraînement utilisent la même séquence d'essai que les essais de test mais leurs données ne sont pas incluses dans les exports.
              </div>
            </>
          )}

          {phase.type === 'TEST' && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nom du bloc (affiché dans la structure)</label>
                <input className={styles.fieldInput} value={s.name || 'Bloc de test'} onChange={(e) => upd({ name: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nombre d'essais</label>
                <input className={styles.fieldInput} type="number" min={1} value={s.trialCount ?? ''} placeholder="nombre d'essais" onChange={(e) => upd({ trialCount: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </div>
              <div className={styles.toggleRow}>
                <span className={styles.fieldLabel}>Randomiser les stimuli</span>
                <div className={`${styles.toggle} ${s.randomize ? styles.toggleOn : ''}`} onClick={() => upd({ randomize: !s.randomize })} />
              </div>
            </>
          )}

          {phase.type === 'PAUSE' && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Texte de pause</label>
                <textarea className={styles.fieldTextarea} rows={3} value={s.text || 'Vous pouvez faire une courte pause. Appuyez sur le bouton quand vous êtes prêt(e) à continuer.'} onChange={(e) => upd({ text: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Libellé du bouton</label>
                <input className={styles.fieldInput} value={s.buttonLabel || 'Continuer'} onChange={(e) => upd({ buttonLabel: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Durée minimale de pause (secondes, 0 = aucune)</label>
                <input className={styles.fieldInput} type="number" min={0} value={s.minDurationSec ?? ''} onChange={(e) => upd({ minDurationSec: e.target.value === '' ? null : Number(e.target.value) })} onBlur={() => { if (s.minDurationSec == null) upd({ minDurationSec: 0 }) }} />
              </div>
            </>
          )}

        </div>
        <div className={styles.stepEditorFooter}>
          <button className={styles.btnSecondary} onClick={onClose}>Annuler</button>
          <button className={styles.btnPrimary} onClick={save}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

// ─── INSPECTEUR PRINCIPAL ─────────────────────────────────────────────────────

export default function StimulusInspector({ block, onSaveBlock }) {
  const [files, setFiles] = useState([])
  const [steps, setSteps] = useState([])
  const [phases, setPhases] = useState([])
  const [uploading, setUploading] = useState(false)
  const [editingStep, setEditingStep] = useState(null)
  const [editingPhase, setEditingPhase] = useState(null)
  const [settings, setSettings] = useState(block.settings || {})
  const [tab, setTab] = useState('structure')
  const [htmlUploading, setHtmlUploading] = useState(false)
  const [newWord, setNewWord] = useState('')
  const [newWordCat, setNewWordCat] = useState('')
  const [addingWord, setAddingWord] = useState(false)
  const fileInputRef = useRef()
  const htmlFileRef = useRef()

  useEffect(() => {
    loadFiles()
    loadSequence()
    const saved = block.settings || {}
    setSettings(saved)
    setPhases(saved.taskPhases || [])
  }, [block.id])

  const loadFiles = async () => {
    try {
      const { data } = await api.get(`/api/stimulus/blocks/${block.id}/files`)
      setFiles(data.files)
    } catch {}
  }

  const loadSequence = async () => {
    try {
      const { data } = await api.get(`/api/stimulus/blocks/${block.id}/sequence`)
      setSteps(data.steps.length > 0 ? data.steps : getDefaultSequence())
    } catch {}
  }

  const saveSequence = async (newSteps) => {
    try {
      await api.put(`/api/stimulus/blocks/${block.id}/sequence`, { steps: newSteps })
    } catch {}
  }

  const savePhases = (newPhases) => {
    const ns = { ...block.settings, ...settings, taskPhases: newPhases }
    setSettings(ns)
    setPhases(newPhases)
    onSaveBlock(block.id, ns)
  }

  const handleHtmlUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      alert('Veuillez sélectionner un fichier .html ou .htm')
      return
    }
    setHtmlUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/api/media/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      // Stocker le chemin relatif : le runner préfixera avec l'URL du backend (port 3002)
      s('externalUrl', data.url)
    } catch (err) {
      console.error(err)
    } finally {
      setHtmlUploading(false)
      e.target.value = ''
    }
  }

  const handleUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (!selectedFiles.length) return
    setUploading(true)
    try {
      for (const file of selectedFiles) {
        const form = new FormData()
        form.append('file', file)
        await api.post(`/api/stimulus/blocks/${block.id}/upload`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      await loadFiles()
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteFile = async (fileId) => {
    try {
      await api.delete(`/api/stimulus/files/${fileId}`)
      setFiles((f) => f.filter((x) => x.id !== fileId))
    } catch {}
  }

  const handleAddWord = async () => {
    if (!newWord.trim()) return
    setAddingWord(true)
    try {
      const { data } = await api.post(`/api/stimulus/blocks/${block.id}/text`, {
        text: newWord.trim(),
        category: newWordCat.trim() || null,
      })
      setFiles((f) => [...f, data.file])
      setNewWord('')
      setNewWordCat('')
    } catch (err) {
      console.error(err)
    } finally {
      setAddingWord(false)
    }
  }

  // ── Gestion étapes essai ───────────────────────────────────────────────────

  const addStep = (type) => {
    const newStep = { id: crypto.randomUUID?.() || Date.now().toString(), type, settings: getDefaultStepSettings(type) }
    const newSteps = [...steps, newStep]
    setSteps(newSteps)
    saveSequence(newSteps)
  }

  const removeStep = (idx) => {
    const newSteps = steps.filter((_, i) => i !== idx)
    setSteps(newSteps)
    saveSequence(newSteps)
  }

  const moveStep = (idx, dir) => {
    const newSteps = [...steps]
    const target = idx + dir
    if (target < 0 || target >= newSteps.length) return
    ;[newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]]
    setSteps(newSteps)
    saveSequence(newSteps)
  }

  const updateStep = (updatedStep) => {
    const newSteps = steps.map((s) => (s === editingStep ? updatedStep : s))
    setSteps(newSteps)
    saveSequence(newSteps)
  }

  // ── Gestion phases structure ───────────────────────────────────────────────

  const addPhase = (type) => {
    const def = PHASE_TYPES.find(t => t.type === type)
    const defaults = {
      INSTRUCTION: { name: 'Instruction', text: '', buttonLabel: 'Continuer' },
      TRAINING:    { name: "Bloc d'entraînement" },
      TEST:        { name: 'Bloc de test', randomize: true },
      PAUSE:       { name: 'Pause', text: 'Vous pouvez faire une courte pause.', buttonLabel: 'Continuer', minDurationSec: 0 },
    }
    const newPhase = { id: crypto.randomUUID?.() || Date.now().toString(), type, settings: defaults[type] || {} }
    savePhases([...phases, newPhase])
  }

  const removePhase = (idx) => savePhases(phases.filter((_, i) => i !== idx))

  const movePhase = (idx, dir) => {
    const newPhases = [...phases]
    const target = idx + dir
    if (target < 0 || target >= newPhases.length) return
    ;[newPhases[idx], newPhases[target]] = [newPhases[target], newPhases[idx]]
    savePhases(newPhases)
  }

  const updatePhase = (updatedPhase) => {
    savePhases(phases.map((p) => (p === editingPhase ? updatedPhase : p)))
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  const s = (k, v) => {
    const ns = { ...block.settings, ...settings, [k]: v }
    setSettings(ns)
    onSaveBlock(block.id, ns)
  }

  // ── Calcul total essais ────────────────────────────────────────────────────
  const totalTrials = phases
    .filter(p => p.type === 'TEST')
    .reduce((acc, p) => acc + (p.settings?.trialCount || 0), 0)
  const trainingTrials = phases
    .filter(p => p.type === 'TRAINING')
    .reduce((acc, p) => acc + (p.settings?.trialCount || 0), 0)

  return (
    <div className={styles.wrap}>
      {/* Onglets */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'structure' ? styles.tabActive : ''}`} onClick={() => setTab('structure')}>Structure</button>
        <button className={`${styles.tab} ${tab === 'sequence' ? styles.tabActive : ''}`} onClick={() => setTab('sequence')}>Essai (séquence)</button>
        <button className={`${styles.tab} ${tab === 'stimuli' ? styles.tabActive : ''}`} onClick={() => setTab('stimuli')}>Stimuli ({files.length})</button>
        <button className={`${styles.tab} ${tab === 'settings' ? styles.tabActive : ''}`} onClick={() => setTab('settings')}>Paramètres</button>
        <button className={`${styles.tab} ${tab === 'external' ? styles.tabActive : ''}`} onClick={() => setTab('external')} style={{ color: tab === 'external' ? undefined : 'var(--blue)' }}>Tâche externe</button>
      </div>

      {/* ── STRUCTURE DE LA TÂCHE ─────────────────────────────────────────────── */}
      {tab === 'structure' && (
        <div className={styles.tabBody}>
          <div className={styles.sectionLabel}>Phases de la tâche</div>

          {phases.length === 0 && (
            <div className={styles.emptyStructure}>
              Aucune phase définie. Ajoutez des phases ci-dessous pour construire la structure complète de votre tâche.
            </div>
          )}

          {/* Résumé */}
          {phases.length > 0 && (trainingTrials > 0 || totalTrials > 0) && (
            <div className={styles.structureSummary}>
              {trainingTrials > 0 && <span>{trainingTrials} essai{trainingTrials > 1 ? 's' : ''} d'entraînement</span>}
              {totalTrials > 0 && <span>{totalTrials} essai{totalTrials > 1 ? 's' : ''} de test</span>}
              {phases.filter(p => p.type === 'TEST').length > 1 && (
                <span>{phases.filter(p => p.type === 'TEST').length} blocs de test</span>
              )}
            </div>
          )}

          <div className={styles.phasesList}>
            {phases.map((phase, i) => {
              const def = PHASE_TYPES.find(t => t.type === phase.type) || PHASE_TYPES[0]
              const col = COLOR_MAP[def.color]
              const phaseName = phase.settings?.name || def.label
              const detail = (phase.type === 'TRAINING' || phase.type === 'TEST') && phase.settings?.trialCount
                ? ` · ${phase.settings.trialCount} essais`
                : ''
              return (
                <div key={phase.id || i} className={styles.phaseRow}>
                  <div className={styles.phaseNum}>{i + 1}</div>
                  <div className={styles.phaseContent}>
                    <div className={styles.phaseBadge} style={{ background: col.bg, color: col.text }}>
                      {def.label}
                    </div>
                    <div className={styles.phaseName}>{phaseName}{detail}</div>
                  </div>
                  <div className={styles.stepActions}>
                    <button className={styles.stepBtn} onClick={() => setEditingPhase(phase)} title="Configurer">⚙</button>
                    <button className={styles.stepBtn} onClick={() => movePhase(i, -1)} disabled={i === 0} title="Monter">▲</button>
                    <button className={styles.stepBtn} onClick={() => movePhase(i, 1)} disabled={i === phases.length - 1} title="Descendre">▼</button>
                    <button className={`${styles.stepBtn} ${styles.stepBtnDanger}`} onClick={() => removePhase(i)} title="Supprimer">✕</button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className={styles.sectionLabel} style={{marginTop:12}}>Ajouter une phase</div>
          <div className={styles.addStepGrid}>
            {PHASE_TYPES.map((t) => {
              const col = COLOR_MAP[t.color]
              return (
                <button key={t.type} className={styles.addStepBtn} onClick={() => addPhase(t.type)}
                  style={{ borderColor: col.bg }}>
                  <span className={styles.addStepLabel} style={{ color: col.text }}>{t.label}</span>
                  <span className={styles.addStepDesc}>{t.desc}</span>
                </button>
              )
            })}
          </div>

          <div className={styles.infoBox} style={{marginTop:12}}>
            La structure définit l'ordre des phases (instructions, entraînement, blocs de test, pauses). La séquence d'essai (fixation, stimulus, réponse…) est configurée dans l'onglet <strong>Essai (séquence)</strong>.
          </div>
        </div>
      )}

      {/* ── SÉQUENCE D'ESSAI ──────────────────────────────────────────────────── */}
      {tab === 'sequence' && (
        <div className={styles.tabBody}>
          <div className={styles.sectionLabel}>Étapes d'un essai (boucle)</div>
          <div className={styles.stepsList}>
            {steps.map((step, i) => {
              const def = STEP_TYPES.find((t) => t.type === step.type) || STEP_TYPES[0]
              const col = COLOR_MAP[def.color]
              const questionSummary = step.type === 'QUESTION' && step.settings?.text
                ? ` · "${step.settings.text.slice(0, 30)}${step.settings.text.length > 30 ? '…' : ''}"`
                : ''
              return (
                <div key={i} className={styles.stepRow}>
                  <div className={styles.stepNum}>{i + 1}</div>
                  <div className={styles.stepBadge} style={{ background: col.bg, color: col.text }}>
                    {def.label}{questionSummary}
                  </div>
                  <div className={styles.stepActions}>
                    <button className={styles.stepBtn} onClick={() => setEditingStep(step)} title="Configurer">⚙</button>
                    <button className={styles.stepBtn} onClick={() => moveStep(i, -1)} disabled={i === 0} title="Monter">▲</button>
                    <button className={styles.stepBtn} onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} title="Descendre">▼</button>
                    <button className={`${styles.stepBtn} ${styles.stepBtnDanger}`} onClick={() => removeStep(i)} title="Supprimer">✕</button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className={styles.sectionLabel} style={{marginTop:12}}>Ajouter une étape</div>
          <div className={styles.addStepGrid}>
            {STEP_TYPES.map((t) => {
              const col = COLOR_MAP[t.color]
              return (
                <button key={t.type} className={styles.addStepBtn} onClick={() => addStep(t.type)}
                  style={{ borderColor: col.bg }}>
                  <span className={styles.addStepLabel} style={{ color: col.text }}>{t.label}</span>
                  <span className={styles.addStepDesc}>{t.desc}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── STIMULI ────────────────────────────────────────────────────────────── */}
      {tab === 'stimuli' && (
        <div className={styles.tabBody}>
          <input ref={fileInputRef} type="file" multiple accept="image/*,audio/*,video/*" style={{ display: 'none' }} onChange={handleUpload} />
          <button className={styles.uploadBtn} onClick={() => fileInputRef.current.click()} disabled={uploading}>
            {uploading ? 'Upload en cours…' : '+ Ajouter des fichiers (image / audio / vidéo)'}
          </button>

          {/* ── Ajout de mot / stimulus textuel ───────────────── */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 3 }}>Mot / texte</div>
              <input
                className={styles.fieldInput}
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="ex : Renard"
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
              />
            </div>
            <div style={{ width: 120 }}>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 3 }}>Catégorie</div>
              <input
                className={styles.fieldInput}
                value={newWordCat}
                onChange={(e) => setNewWordCat(e.target.value)}
                placeholder="ex : animal"
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
              />
            </div>
            <button
              className={styles.uploadBtn}
              style={{ padding: '7px 14px', whiteSpace: 'nowrap' }}
              onClick={handleAddWord}
              disabled={addingWord || !newWord.trim()}
            >
              {addingWord ? '…' : '+ Mot'}
            </button>
          </div>

          <div className={styles.filesList}>
            {files.length === 0 && <p className={styles.emptyFiles}>Aucun fichier uploadé.</p>}
            {files.map((f) => (
              <div key={f.id} className={styles.fileRow}>
                <div className={styles.filePreview}>
                  {f.mimetype === 'text/plain' && <span className={styles.fileIcon} style={{ fontSize: 14, fontWeight: 700 }}>Aa</span>}
                  {f.mimetype.startsWith('image/') && <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}${f.url}`} alt={f.originalName} className={styles.fileThumb} />}
                  {f.mimetype.startsWith('audio/') && <span className={styles.fileIcon}>🎵</span>}
                  {f.mimetype.startsWith('video/') && <span className={styles.fileIcon}>🎬</span>}
                </div>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{f.originalName}</span>
                  {f.category && <span className={styles.fileCategory}>{f.category}</span>}
                  {f.mimetype !== 'text/plain' && <span className={styles.fileSize}>{(f.size / 1024).toFixed(0)} Ko</span>}
                </div>
                <button className={styles.fileDeleteBtn} onClick={() => handleDeleteFile(f.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PARAMÈTRES ─────────────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className={styles.tabBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Nombre de répétitions par stimulus</label>
            <input className={styles.fieldInput} type="number" min={1} value={settings.repetitions ?? ''} onChange={(e) => s('repetitions', e.target.value === '' ? null : Number(e.target.value))} onBlur={() => { if (!settings.repetitions) s('repetitions', 1) }} />
            <span className={styles.fieldHint}>
              Total essais = {files.length} stimuli × {settings.repetitions || 1} répétitions = <strong>{files.length * (settings.repetitions || 1)} essais</strong>
            </span>
          </div>
          <div className={styles.toggleRow}>
            <span className={styles.fieldLabel}>Randomiser l'ordre des stimuli</span>
            <div className={`${styles.toggle} ${settings.randomize ? styles.toggleOn : ''}`} onClick={() => s('randomize', !settings.randomize)} />
          </div>
          <div className={styles.toggleRow}>
            <span className={styles.fieldLabel}>Randomisation par bloc de répétition</span>
            <div className={`${styles.toggle} ${settings.randomizeByBlock ? styles.toggleOn : ''}`} onClick={() => s('randomizeByBlock', !settings.randomizeByBlock)} />
          </div>
          <div className={styles.infoBox}>
            Bloc de répétition : garantit qu'un même stimulus n'apparaît pas deux fois consécutivement et que les répétitions sont réparties sur l'ensemble de la tâche.
          </div>

          {/* ── Apparence ─────────────────────────────────────── */}
          <div className={styles.sectionLabel} style={{ marginTop: 20 }}>Apparence de la tâche</div>

          <div className={styles.twoCol}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Couleur de fond</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="color" value={settings.bgColor || '#000000'} onChange={(e) => s('bgColor', e.target.value)} style={{ width: 36, height: 30, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                <input className={styles.fieldInput} value={settings.bgColor || '#000000'} onChange={(e) => setSettings((p) => ({ ...p, bgColor: e.target.value }))} onBlur={(e) => s('bgColor', e.target.value)} style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Couleur du texte</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="color" value={settings.textColor || '#ffffff'} onChange={(e) => s('textColor', e.target.value)} style={{ width: 36, height: 30, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                <input className={styles.fieldInput} value={settings.textColor || '#ffffff'} onChange={(e) => setSettings((p) => ({ ...p, textColor: e.target.value }))} onBlur={(e) => s('textColor', e.target.value)} style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }} />
              </div>
            </div>
          </div>

          <div className={styles.twoCol}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Taille du stimulus</label>
              <select className={styles.fieldSelect} value={settings.stimulusSize || 'large'} onChange={(e) => s('stimulusSize', e.target.value)}>
                <option value="small">Petit (32px)</option>
                <option value="medium">Moyen (48px)</option>
                <option value="large">Grand (56px)</option>
                <option value="xlarge">Très grand (72px)</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Taille de la fixation</label>
              <select className={styles.fieldSelect} value={settings.fixationSize || 'medium'} onChange={(e) => s('fixationSize', e.target.value)}>
                <option value="small">Petit (32px)</option>
                <option value="medium">Moyen (48px)</option>
                <option value="large">Grand (64px)</option>
              </select>
            </div>
          </div>

          <div className={styles.twoCol}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Couleur feedback correct</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="color" value={settings.correctColor || '#1D9E75'} onChange={(e) => s('correctColor', e.target.value)} style={{ width: 36, height: 30, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                <input className={styles.fieldInput} value={settings.correctColor || '#1D9E75'} onChange={(e) => setSettings((p) => ({ ...p, correctColor: e.target.value }))} onBlur={(e) => s('correctColor', e.target.value)} style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Couleur feedback incorrect</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="color" value={settings.incorrectColor || '#DC2626'} onChange={(e) => s('incorrectColor', e.target.value)} style={{ width: 36, height: 30, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                <input className={styles.fieldInput} value={settings.incorrectColor || '#DC2626'} onChange={(e) => setSettings((p) => ({ ...p, incorrectColor: e.target.value }))} onBlur={(e) => s('incorrectColor', e.target.value)} style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }} />
              </div>
            </div>
          </div>

          {/* ── Synchronisation physiologique ──────────────────────────────── */}
          <div className={styles.sectionLabel} style={{ marginTop: 20 }}>Synchronisation (bloc Tâche)</div>
          <div className={styles.infoBox}>
            La configuration de l'outil physiologique (EEG, ECG, eye-tracking) se fait dans l'onglet <strong>Mesures physio</strong> au niveau de l'étude. Ici, configurez uniquement les marqueurs spécifiques aux événements de cette tâche.
          </div>

          <div className={styles.toggleRow}>
            <span className={styles.fieldLabel}>Activer les marqueurs LSL</span>
            <div className={`${styles.toggle} ${settings.lslEnabled ? styles.toggleOn : ''}`} onClick={() => s('lslEnabled', !settings.lslEnabled)} />
          </div>

          {settings.lslEnabled && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Port WebSocket du relay</label>
                <input className={styles.fieldInput} type="number" value={settings.lslPort || 12345}
                  onChange={(e) => setSettings((p) => ({ ...p, lslPort: Number(e.target.value) }))}
                  onBlur={(e) => s('lslPort', Number(e.target.value) || 12345)} />
              </div>

              <div className={styles.sectionLabel} style={{ marginTop: 12 }}>Codes des marqueurs</div>
              <div className={styles.twoCol}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Fixation</label>
                  <input className={styles.fieldInput} value={settings.markerCodes?.fixation || 'F'}
                    onChange={(e) => s('markerCodes', { ...settings.markerCodes, fixation: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Stimulus</label>
                  <input className={styles.fieldInput} value={settings.markerCodes?.stimulus || 'S'}
                    onChange={(e) => s('markerCodes', { ...settings.markerCodes, stimulus: e.target.value })} />
                </div>
              </div>
              <div className={styles.twoCol}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Réponse</label>
                  <input className={styles.fieldInput} value={settings.markerCodes?.response || 'R'}
                    onChange={(e) => s('markerCodes', { ...settings.markerCodes, response: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Feedback</label>
                  <input className={styles.fieldInput} value={settings.markerCodes?.feedback || 'FB'}
                    onChange={(e) => s('markerCodes', { ...settings.markerCodes, feedback: e.target.value })} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TÂCHE EXTERNE ────────────────────────────────────────────────────── */}
      {tab === 'external' && (
        <div className={styles.tabBody}>
          <div className={styles.externalHeader}>
            <div className={styles.externalTitle}>Intégration d'une tâche externe</div>
            <div className={styles.externalSubtitle}>
              Utilisez une tâche déjà prête (HTML, PsychoPy, PsyToolkit, OpenSesame) sans la recréer dans MindCraft.
            </div>
          </div>

          {/* Mode */}
          <div className={styles.sectionLabel}>Mode d'intégration</div>
          <div className={styles.externalModeGrid}>
            <button
              className={`${styles.externalModeCard} ${(settings.externalMode || 'iframe') === 'iframe' ? styles.externalModeActive : ''}`}
              onClick={() => s('externalMode', 'iframe')}
            >
              <div className={styles.externalModeIcon}>⊡</div>
              <div className={styles.externalModeName}>iFrame</div>
              <div className={styles.externalModeDesc}>La tâche s'affiche directement dans la page de l'étude (recommandé)</div>
            </button>
            <button
              className={`${styles.externalModeCard} ${settings.externalMode === 'redirect' ? styles.externalModeActive : ''}`}
              onClick={() => s('externalMode', 'redirect')}
            >
              <div className={styles.externalModeIcon}>↗</div>
              <div className={styles.externalModeName}>Redirection</div>
              <div className={styles.externalModeDesc}>Le participant est redirigé vers la tâche puis revient sur l'étude</div>
            </button>
          </div>

          {/* Upload HTML local */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Fichier HTML local</label>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <button
                className={styles.uploadInlineBtn}
                onClick={() => htmlFileRef.current.click()}
                disabled={htmlUploading}
                style={{padding:'6px 12px', fontSize:'12px', display:'flex', alignItems:'center', gap:6}}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                {htmlUploading ? 'Upload…' : 'Uploader un fichier .html'}
              </button>
              <input
                ref={htmlFileRef}
                type="file"
                accept=".html,.htm"
                style={{ display: 'none' }}
                onChange={handleHtmlUpload}
              />
              {(settings.externalUrl?.includes('/uploads/') || settings.externalUrl?.includes('/api/media/files/')) && (
                <span style={{fontSize:'11px', color:'var(--success)', fontWeight:500}}>✓ Fichier hébergé</span>
              )}
            </div>
            <span className={styles.fieldHint}>
              Uploadez votre fichier .html — MindCraft l'hébergera et remplira l'URL ci-dessous automatiquement.
            </span>
          </div>

          {/* URL */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>URL de la tâche</label>
            <input
              className={styles.fieldInput}
              value={settings.externalUrl || ''}
              onChange={(e) => s('externalUrl', e.target.value)}
              placeholder="https://run.psytoolkit.org/survey/xxx  ou  https://pavlovia.org/run/…"
            />
            <span className={styles.fieldHint}>
              Utilisez <code style={{background:'var(--gray-100)',padding:'1px 4px',borderRadius:3}}>{'{participantId}'}</code> dans l'URL pour passer l'identifiant du participant automatiquement.
            </span>
          </div>

          {/* Options iFrame */}
          {(settings.externalMode || 'iframe') === 'iframe' && (
            <>
              <div className={styles.twoCol}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Hauteur de l'iframe (px)</label>
                  <input className={styles.fieldInput} type="number" min={200}
                    value={settings.iframeHeight ?? 600}
                    onChange={(e) => setSettings((p) => ({ ...p, iframeHeight: e.target.value === '' ? '' : Number(e.target.value) }))}
                    onBlur={(e) => s('iframeHeight', Number(e.target.value) || 600)}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Détection de fin de tâche</label>
                <select className={styles.fieldSelect} value={settings.completionMode || 'button'} onChange={(e) => s('completionMode', e.target.value)}>
                  <option value="button">Bouton "Terminer" affiché sous l'iframe</option>
                  <option value="message">Message postMessage depuis la tâche</option>
                  <option value="duration">Durée fixe (minuterie)</option>
                </select>
              </div>
              {settings.completionMode === 'button' && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Libellé du bouton</label>
                  <input className={styles.fieldInput} value={settings.completionButtonLabel || 'J\'ai terminé la tâche'} onChange={(e) => s('completionButtonLabel', e.target.value)} />
                </div>
              )}
              {settings.completionMode === 'message' && (
                <div className={styles.infoBox}>
                  Votre tâche doit appeler <code>window.parent.postMessage('mindcraft:complete', '*')</code> à la fin. Compatible avec les tâches HTML/JS personnalisées.
                </div>
              )}
              {settings.completionMode === 'duration' && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Durée (secondes)</label>
                  <input className={styles.fieldInput} type="number" min={1} value={settings.completionDuration ?? ''} onChange={(e) => s('completionDuration', e.target.value === '' ? null : Number(e.target.value))} onBlur={() => { if (!settings.completionDuration) s('completionDuration', 300) }} />
                </div>
              )}
            </>
          )}

          {/* Options Redirect */}
          {settings.externalMode === 'redirect' && (
            <>
              <div className={styles.infoBox}>
                <strong>URL de retour :</strong> configurez votre tâche externe pour rediriger vers<br />
                <code style={{fontSize:11,wordBreak:'break-all'}}>{`[URL_ETUDE]/run/[studyId]?resume=1&pid={participantId}`}</code><br /><br />
                MindCraft reprendra automatiquement là où le participant s'est arrêté à son retour.
              </div>
              <div className={styles.toggleRow}>
                <span className={styles.fieldLabel}>Ouvrir dans un nouvel onglet</span>
                <div className={`${styles.toggle} ${settings.externalNewTab ? styles.toggleOn : ''}`} onClick={() => s('externalNewTab', !settings.externalNewTab)} />
              </div>
            </>
          )}

          {/* Compatibilité */}
          <div className={styles.sectionLabel} style={{marginTop:4}}>Compatibilité des outils</div>
          <div className={styles.compatTable}>
            {[
              { tool: 'HTML/JS personnalisé',   iframe: true,  redirect: true  },
              { tool: 'PsyToolkit',             iframe: true,  redirect: true  },
              { tool: 'PsychoPy (Pavlovia)',    iframe: true,  redirect: true  },
              { tool: 'OpenSesame (OSWeb/JATOS)',iframe: true,  redirect: true  },
              { tool: 'Qualtrics',              iframe: false, redirect: true  },
              { tool: 'Google Forms',           iframe: false, redirect: true  },
            ].map(({ tool, iframe, redirect }) => (
              <div key={tool} className={styles.compatRow}>
                <span className={styles.compatTool}>{tool}</span>
                <span className={`${styles.compatBadge} ${iframe ? styles.compatOk : styles.compatNo}`}>iFrame {iframe ? '✓' : '✗'}</span>
                <span className={`${styles.compatBadge} ${redirect ? styles.compatOk : styles.compatNo}`}>Redirect {redirect ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>

          {/* ── Marqueurs LSL pour tâche externe ─────────────────────────── */}
          <div className={styles.sectionLabel} style={{ marginTop: 20 }}>Synchronisation (tâche externe)</div>
          <div className={styles.infoBox}>
            Envoyez des marqueurs LSL au début et à la fin de la tâche externe pour synchroniser avec vos enregistrements physiologiques (EEG, eye-tracking, etc.).
          </div>

          <div className={styles.toggleRow}>
            <span className={styles.fieldLabel}>Activer les marqueurs LSL</span>
            <div className={`${styles.toggle} ${settings.lslEnabled ? styles.toggleOn : ''}`} onClick={() => s('lslEnabled', !settings.lslEnabled)} />
          </div>

          {settings.lslEnabled && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Port WebSocket du relay</label>
                <input className={styles.fieldInput} type="number" value={settings.lslPort || 12345}
                  onChange={(e) => setSettings((p) => ({ ...p, lslPort: Number(e.target.value) }))}
                  onBlur={(e) => s('lslPort', Number(e.target.value) || 12345)} />
              </div>
              <div className={styles.twoCol}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Marqueur début</label>
                  <input className={styles.fieldInput} value={settings.markerCodes?.taskStart || 'TASK_START'}
                    onChange={(e) => s('markerCodes', { ...settings.markerCodes, taskStart: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Marqueur fin</label>
                  <input className={styles.fieldInput} value={settings.markerCodes?.taskEnd || 'TASK_END'}
                    onChange={(e) => s('markerCodes', { ...settings.markerCodes, taskEnd: e.target.value })} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Éditeurs */}
      {editingStep && (
        <StepEditor
          step={editingStep}
          onUpdate={updateStep}
          onClose={() => setEditingStep(null)}
        />
      )}
      {editingPhase && (
        <PhaseEditor
          phase={editingPhase}
          onUpdate={updatePhase}
          onClose={() => setEditingPhase(null)}
        />
      )}

      <button
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 16 }}
        onClick={() => onSaveBlock(block.id, { ...block.settings, ...settings })}
      >
        Sauvegarder
      </button>
    </div>
  )
}

function getDefaultSequence() {
  return [
    { type: 'FIXATION',     settings: { symbol: '+', durationMin: 500, durationMax: 500 } },
    { type: 'STIMULUS',     settings: { durationMin: 0, durationMax: 0 } },
    { type: 'RESPONSE_KEY', settings: { maxResponseTime: 2000, keyMap: [{ key: 'KeyF', label: 'Catégorie A' }, { key: 'KeyJ', label: 'Catégorie B' }] } },
    { type: 'FEEDBACK',     settings: { correctText: '✓', incorrectText: '✗', timeoutText: 'Trop lent !', durationMin: 500, durationMax: 500 } },
    { type: 'ITI',          settings: { durationMin: 600, durationMax: 1000 } },
  ]
}

function getDefaultStepSettings(type) {
  const defaults = {
    INSTRUCTION_PAGE: { text: '', buttonLabel: 'Commencer' },
    WAIT_KEY:         { symbol: '●', key: 'Space' },
    FIXATION:         { symbol: '+', durationMin: 500, durationMax: 500 },
    BLANK:            { durationMin: 200, durationMax: 200 },
    STIMULUS:         { durationMin: 0, durationMax: 0 },
    RESPONSE_KEY:     { maxResponseTime: 2000, keyMap: [{ key: 'KeyF', label: 'Catégorie A' }, { key: 'KeyJ', label: 'Catégorie B' }] },
    FEEDBACK:         { correctText: '✓', incorrectText: '✗', timeoutText: 'Trop lent !', durationMin: 500, durationMax: 500 },
    QUESTION:         { text: '', responseType: 'RADIO', choices: [{ label: 'Oui' }, { label: 'Non' }], required: true },
    ITI:              { durationMin: 600, durationMax: 1000 },
  }
  return defaults[type] || {}
}
