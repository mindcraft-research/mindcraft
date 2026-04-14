import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import StimulusInspector from './StimulusInspector'
import LogicInspector from './LogicInspector'
import { Tooltip, Toggle } from './FormWidgets'
import styles from './BlockInspector.module.css'
import api from '../../lib/api'

const RichEditor = dynamic(() => import('./RichEditor'), { ssr: false })

// ─── CHAMP MÉDIA (URL + upload) ───────────────────────────────────────────────

function MediaUrlField({ value, onChange, accept, placeholder }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState(null)
  const inputRef                  = useRef()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/api/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      // Le chemin retourné est relatif au serveur API (/uploads/…)
      // On préfixe avec l'URL de base pour que les médias soient accessibles partout
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
      const url = res.data.url?.startsWith('/') ? `${apiBase}${res.data.url}` : res.data.url
      onChange(url)
    } catch {
      setError('Échec du chargement')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const isImage = accept?.startsWith('image')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="form-input"
          style={{ flex: 1 }}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'https://…'}
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '…' : 'Choisir un fichier'}
        </button>
        <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleFile} />
      </div>
      {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
      {isImage && value && (
        <img src={value} alt="aperçu" style={{ maxHeight: 80, maxWidth: '100%', borderRadius: 6, border: '1px solid var(--gray-200)', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none' }} />
      )}
    </div>
  )
}

// ─── GROUPES ET TYPES DE QUESTIONS ───────────────────────────────────────────

const QUESTION_GROUPS = [
  {
    label: 'Choix unique',
    types: [
      { value: 'RADIO',         label: 'Boutons radio' },
      { value: 'SELECT',        label: 'Liste déroulante' },
      { value: 'BUTTON_GROUP',  label: 'Boutons (style bootstrap)' },
      { value: 'MEDIA_RADIO',   label: 'Choix avec image / audio / vidéo' },
      { value: 'RADIO_COMMENT', label: 'Choix unique + commentaire libre' },
      { value: 'DRILL_DOWN',    label: 'Drill down (cascading)' },
    ],
  },
  {
    label: 'Choix multiple',
    types: [
      { value: 'CHECKBOX',         label: 'Cases à cocher' },
      { value: 'MEDIA_CHECKBOX',   label: 'Cases à cocher avec médias' },
      { value: 'CHECKBOX_COMMENT', label: 'Choix multiple + commentaire libre' },
    ],
  },
  {
    label: 'Texte libre',
    types: [
      { value: 'TEXT',         label: 'Texte court / long' },
      { value: 'INPUT_DEMAND', label: 'Saisie à la demande' },
      { value: 'FILL_BLANK',   label: 'Texte à trous (saisie)' },
    ],
  },
  {
    label: 'Échelles & sliders',
    types: [
      { value: 'LIKERT',        label: 'Échelle de Likert' },
      { value: 'MATRIX',        label: 'Matrice Likert (tableau)' },
      { value: 'SLIDER',        label: 'Slider / VAS' },
      { value: 'SEMANTIC_DIFF', label: 'Différentiel sémantique' },
      { value: 'SIDE_BY_SIDE',  label: 'Side by side' },
    ],
  },
  {
    label: 'Numérique',
    types: [
      { value: 'NUMERIC',       label: 'Saisie numérique' },
      { value: 'EQUATION',      label: 'Équation / calcul' },
      { value: 'COMPUTED',      label: 'Calcul automatique' },
      { value: 'CONSTANT_SUM',  label: 'Somme constante' },
    ],
  },
  {
    label: 'Affichage (sans collecte)',
    types: [
      { value: 'DISPLAY', label: 'Texte / HTML' },
      { value: 'IMAGE',   label: 'Image' },
      { value: 'AUDIO',   label: 'Fichier audio' },
      { value: 'VIDEO',   label: 'Vidéo' },
    ],
  },
  {
    label: 'Spécial',
    types: [
      { value: 'RANKING',     label: 'Classement (drag & drop)' },
      { value: 'DATE',        label: 'Date / heure' },
      { value: 'FILE_UPLOAD', label: 'Upload fichier' },
      { value: 'TIMING',      label: 'Timing (temps sur la page)' },
      { value: 'HOTSPOT',     label: 'Hot spot (clic sur image)' },
      { value: 'DRAG_DROP',   label: 'Drag & drop (catégorisation)' },
      { value: 'DROP_WORD',   label: 'Drop the word (glisser-déposer)' },
      { value: 'HIGHLIGHT',   label: 'Surlignage de texte' },
      { value: 'META_INFO',   label: 'Méta-infos (navigateur, OS…)' },
    ],
  },
  {
    label: 'Autre',
    types: [
      { value: 'CONSENT', label: 'Consentement' },
    ],
  },
]

const QUESTION_TYPES = QUESTION_GROUPS.flatMap((g) => g.types)
// types affichage pur (infoBox "aucune donnée collectée") — le code reste optionnel
const DISPLAY_ONLY_TYPES = ['DISPLAY', 'IMAGE', 'AUDIO', 'VIDEO']
// alias conservé pour la vérification dans la liste des questions du bloc
const NO_CODE_TYPES  = DISPLAY_ONLY_TYPES

// ─── DESCRIPTIONS DES TYPES ───────────────────────────────────────────────────

const TYPE_DESCRIPTIONS = {
  RADIO:            "Un seul choix parmi plusieurs options, affiché sous forme de boutons radio.",
  SELECT:           "Un seul choix via une liste déroulante. Préférable quand il y a beaucoup d'options.",
  BUTTON_GROUP:     "Un seul choix via des boutons cliquables (style bootstrap). Plus visuel que les boutons radio classiques.",
  MEDIA_RADIO:      "Choix unique où chaque option est accompagnée d'une image, d'un audio ou d'une vidéo.",
  RADIO_COMMENT:    "Choix unique avec un champ texte facultatif pour un commentaire libre.",
  DRILL_DOWN:       "Choix en cascade : le choix de niveau 1 détermine les options de niveau 2 (ex : pays → ville → quartier).",
  CHECKBOX:         "Plusieurs choix simultanément possibles.",
  MEDIA_CHECKBOX:   "Choix multiple où chaque option est accompagnée d'un média (image, audio, vidéo).",
  CHECKBOX_COMMENT: "Choix multiple avec un champ commentaire facultatif en fin de liste.",
  TEXT:             "Saisie de texte libre, court (une ligne) ou long (paragraphe multi-lignes).",
  INPUT_DEMAND:     "Un champ qui n'apparaît que lorsque le participant clique sur un déclencheur (ex : « Ajouter un commentaire »).",
  FILL_BLANK:       "Une phrase à compléter : le participant tape ses réponses dans les trous. Utilisez [BLANK] pour indiquer chaque trou.",
  LIKERT:           "Échelle de N points pour évaluer un accord ou une intensité. Pour une batterie de plusieurs items sur la même échelle, utilisez la Matrice Likert.",
  MATRIX:           "Plusieurs items évalués sur la même échelle, présentés en tableau. Gain de place pour les batteries de questions (ex : NEO-PI-R, BFI…).",
  SLIDER:           "Curseur continu entre un minimum et un maximum. Idéal pour les échelles visuelles analogiques (VAS) ou les évaluations en pourcentage.",
  SEMANTIC_DIFF:    "Tableau de paires d'antonymes (ex : Bon ←——→ Mauvais). Pour chaque ligne, le participant positionne son jugement entre les deux pôles opposés sur une même échelle. Chaque ligne = une dimension, un seul objet évalué.",
  SIDE_BY_SIDE:     "Tableau à colonnes multiples : les mêmes lignes (items ou énoncés) sont évaluées simultanément sur plusieurs sous-questions différentes. Exemple : évaluer 5 publicités sur leur crédibilité, leur attrait et leur clarté dans un seul tableau, avec une colonne par critère.",
  CONSTANT_SUM:     "Le participant distribue un total fixe (ex : 100 points) entre plusieurs options. Mesure l'importance relative accordée à chaque option.",
  NUMERIC:          "Saisie d'un nombre entier ou décimal avec des bornes optionnelles (min / max).",
  EQUATION:         "Le participant entre le résultat d'un calcul ou d'une formule.",
  COMPUTED:         "Le participant saisit plusieurs valeurs numériques (ex : taille, poids) et la plateforme calcule automatiquement un résultat via une formule définie par le chercheur (ex : IMC, dépense calorique, score composite).",
  DISPLAY:          "Affiche du texte ou du HTML enrichi (images inline, mise en forme). Aucune réponse collectée.",
  IMAGE:            "Affiche une image depuis une URL. Aucune réponse collectée.",
  AUDIO:            "Diffuse un fichier audio. Aucune réponse collectée.",
  VIDEO:            "Diffuse une vidéo (fichier direct ou YouTube). Aucune réponse collectée.",
  RANKING:          "Le participant ordonne des éléments par glisser-déposer. L'ordre final est enregistré.",
  DATE:             "Saisie d'une date, d'une heure ou des deux.",
  FILE_UPLOAD:      "Le participant télécharge un ou plusieurs fichiers depuis son appareil.",
  TIMING:           "Mesure automatiquement le temps passé sur la page en millisecondes. Aucune interaction du participant.",
  HOTSPOT:          "Le participant clique sur une zone d'une image. Les coordonnées (X/Y en %) sont enregistrées.",
  DRAG_DROP:        "Le participant glisse des cartes (éléments) vers des boîtes (catégories). Exemple : trier une liste de mots en deux colonnes « Positif / Négatif », ou associer des concepts à des catégories.",
  DROP_WORD:        "Le participant complète une phrase à trous en glissant des mots depuis une banque de mots.",
  HIGHLIGHT:        "Le participant surligne des passages dans un texte affiché.",
  META_INFO:        "Collecte automatiquement des informations techniques (navigateur, OS, résolution). Aucune interaction du participant.",
  CONSENT:          "Question de consentement avec un bouton Accepter et un bouton Refuser. Un refus redirige automatiquement vers le Message de fin.",
}

// ─── INSPECTEUR MESSAGE D'ACCUEIL ─────────────────────────────────────────────

function WelcomeInspector({ block, onSave }) {
  const [settings, setSettings] = useState(block.settings || {})
  const s = (k, v) => setSettings((p) => ({ ...p, [k]: v }))
  useEffect(() => { setSettings(block.settings || {}) }, [block.id])
  return (
    <div className={styles.inspectorBody}>
      <div className="form-group">
        <label className="form-label">Titre de la page</label>
        <input className="form-input" value={settings.title || ''} onChange={(e) => s('title', e.target.value)} placeholder="ex : Bienvenue dans cette étude" />
      </div>
      <div className="form-group">
        <label className="form-label">Contenu (notice d'information)</label>
        <RichEditor value={settings.content || ''} onChange={(html) => s('content', html)} />
      </div>
      <div className="form-group">
        <label className="form-label">Libellé du bouton de démarrage</label>
        <input className="form-input" value={settings.buttonLabel || 'Commencer'} onChange={(e) => s('buttonLabel', e.target.value)} />
      </div>

      <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: 12, paddingTop: 12 }}>
        <label className="form-label">Bandeau de logos (laboratoire, partenaires)</label>
        <p style={{ fontSize: 11, color: 'var(--gray-400)', margin: '0 0 8px' }}>Ajoutez les logos de votre laboratoire et de vos partenaires. Ils seront affichés en haut de la page d'accueil et de fin.</p>
        {(settings.logos || []).map((logo, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <MediaUrlField
              value={logo}
              onChange={(url) => {
                const logos = [...(settings.logos || [])]
                logos[i] = url
                s('logos', logos)
              }}
              accept="image/*"
              placeholder="URL ou uploader un logo"
            />
            <button type="button" className={styles.removeBtn} onClick={() => {
              const logos = (settings.logos || []).filter((_, j) => j !== i)
              s('logos', logos)
            }}>✕</button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 4 }} onClick={() => s('logos', [...(settings.logos || []), ''])}>
          + Ajouter un logo
        </button>
      </div>

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={() => onSave(block.id, { ...block.settings, ...settings })}>Sauvegarder</button>
    </div>
  )
}

// ─── INSPECTEUR INSTRUCTION ───────────────────────────────────────────────────

function InstructionInspector({ block, onSave }) {
  const [settings, setSettings] = useState(block.settings || {})
  const s = (k, v) => setSettings((p) => ({ ...p, [k]: v }))
  useEffect(() => { setSettings(block.settings || {}) }, [block.id])
  return (
    <div className={styles.inspectorBody}>
      <div className="form-group">
        <label className="form-label">Titre de la page</label>
        <input className="form-input" value={settings.title || ''} onChange={(e) => s('title', e.target.value)} placeholder="ex : Bienvenue" />
      </div>
      <div className="form-group">
        <label className="form-label">Contenu</label>
        <RichEditor value={settings.content || ''} onChange={(html) => s('content', html)} />
      </div>
      <div className="form-group">
        <label className="form-label">Libellé du bouton</label>
        <input className="form-input" value={settings.buttonLabel || 'Continuer'} onChange={(e) => s('buttonLabel', e.target.value)} />
      </div>
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onSave(block.id, { ...block.settings, ...settings })}>Sauvegarder</button>
    </div>
  )
}

// ─── INSPECTEUR DEBRIEFING ────────────────────────────────────────────────────

function DebriefingInspector({ block, onSave }) {
  const [settings, setSettings] = useState(block.settings || {})
  const s = (k, v) => setSettings((p) => ({ ...p, [k]: v }))
  useEffect(() => { setSettings(block.settings || {}) }, [block.id])
  return (
    <div className={styles.inspectorBody}>
      <div className="form-group">
        <label className="form-label">Titre</label>
        <input className="form-input" value={settings.title || 'Merci !'} onChange={(e) => s('title', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Contenu du debriefing</label>
        <RichEditor value={settings.content || ''} onChange={(html) => s('content', html)} />
      </div>
      <div className="form-group">
        <label className="form-label">URL de redirection (ex : Prolific)</label>
        <input className="form-input" value={settings.redirectUrl || ''} onChange={(e) => s('redirectUrl', e.target.value)} placeholder="https://app.prolific.com/submissions/complete?cc=XXXX" />
      </div>

      <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: 12, paddingTop: 12 }}>
        <label className="form-label">Bandeau de logos (laboratoire, partenaires)</label>
        <p style={{ fontSize: 11, color: 'var(--gray-400)', margin: '0 0 8px' }}>Les logos seront affichés en bas de la page de fin, comme sur la page d'accueil.</p>
        {(settings.logos || []).map((logo, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <MediaUrlField
              value={logo}
              onChange={(url) => {
                const logos = [...(settings.logos || [])]
                logos[i] = url
                s('logos', logos)
              }}
              accept="image/*"
              placeholder="URL ou uploader un logo"
            />
            <button type="button" className={styles.removeBtn} onClick={() => {
              const logos = (settings.logos || []).filter((_, j) => j !== i)
              s('logos', logos)
            }}>✕</button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 4 }} onClick={() => s('logos', [...(settings.logos || []), ''])}>
          + Ajouter un logo
        </button>
      </div>

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={() => onSave(block.id, { ...block.settings, ...settings })}>Sauvegarder</button>
    </div>
  )
}

// ─── FORMULAIRE QUESTION ──────────────────────────────────────────────────────

function QuestionForm({ blockId, question, onSave, onCancel, blockQuestions = [] }) {
  const initChoices = question?.choices?.length
    ? question.choices
    : [{ code: '1', label: '' }, { code: '2', label: '' }, { code: '3', label: '' }]

  const initMatrix = question?.matrixItems?.length
    ? question.matrixItems
    : [{ code: 'item1', label: '', reversed: false, left: '', right: '' }]

  const [form, setForm] = useState(
    question
      ? { ...question, choices: initChoices, matrixItems: initMatrix }
      : { code: '', type: 'RADIO', text: '', required: true, randomize: false, settings: {}, choices: initChoices, matrixItems: initMatrix }
  )

  const setField   = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const setSetting = (k, v) => setForm((p) => ({ ...p, settings: { ...p.settings, [k]: v } }))

  // ── Choix ──────────────────────────────────────────────────────────────────
  const addChoice    = ()         => setForm((p) => ({ ...p, choices: [...(p.choices||[]), { code: String((p.choices||[]).length+1), label:'', anchored:false }] }))
  const updateChoice = (i, f, v)  => setForm((p) => { const c=[...(p.choices||[])]; c[i]={...c[i],[f]:v}; return {...p,choices:c} })
  const removeChoice = (i)        => setForm((p) => ({ ...p, choices:(p.choices||[]).filter((_,j)=>j!==i) }))

  // ── Items matrice / sémantique ─────────────────────────────────────────────
  const addMatrixItem    = (d={}) => setForm((p) => ({ ...p, matrixItems:[...(p.matrixItems||[]), { code:`item${(p.matrixItems||[]).length+1}`, label:'', reversed:false, left:'', right:'', ...d }] }))
  const updateMatrixItem = (i, f, v) => setForm((p) => { const m=[...(p.matrixItems||[])]; m[i]={...m[i],[f]:v}; return {...p,matrixItems:m} })
  const removeMatrixItem = (i)    => setForm((p) => ({ ...p, matrixItems:(p.matrixItems||[]).filter((_,j)=>j!==i) }))

  // ── Labels colonnes matrice ────────────────────────────────────────────────
  const getColumnLabels = useCallback(() => {
    const cols = Number(form.settings?.columns) || 5
    const existing = form.settings?.columnLabels || []
    return Array.from({ length: cols }, (_, i) => existing[i] || '')
  }, [form.settings?.columns, form.settings?.columnLabels])

  const updateColumnLabel = (i, val) => {
    const labels = getColumnLabels(); labels[i] = val; setSetting('columnLabels', labels)
  }

  // ── Zones (DRAG_DROP) ──────────────────────────────────────────────────────
  const addZone    = ()        => setSetting('zones', [...(form.settings?.zones||[]), { code:`zone${(form.settings?.zones||[]).length+1}`, label:'' }])
  const updateZone = (i, f, v) => { const z=[...(form.settings?.zones||[])]; z[i]={...z[i],[f]:v}; setSetting('zones',z) }
  const removeZone = (i)       => setSetting('zones', (form.settings?.zones||[]).filter((_,j)=>j!==i))

  // ── Drapeaux de type ───────────────────────────────────────────────────────
  const t = form.type
  const isDisplayType  = NO_CODE_TYPES.includes(t)
  const needsChoices   = ['RADIO','SELECT','BUTTON_GROUP','MEDIA_RADIO','RADIO_COMMENT','CHECKBOX','MEDIA_CHECKBOX','CHECKBOX_COMMENT','RANKING','CONSTANT_SUM','DRAG_DROP','DRILL_DOWN'].includes(t)
  const hasMedia       = ['MEDIA_RADIO','MEDIA_CHECKBOX'].includes(t)
  const hasComment     = ['RADIO_COMMENT','CHECKBOX_COMMENT'].includes(t)
  const isLikert       = t === 'LIKERT'
  const isMatrix       = t === 'MATRIX'
  const isSlider       = t === 'SLIDER'
  const isSemanticDiff = t === 'SEMANTIC_DIFF'
  const isSideBySide   = t === 'SIDE_BY_SIDE'
  const isConstantSum  = t === 'CONSTANT_SUM'
  const isText         = t === 'TEXT'
  const isInputDemand  = t === 'INPUT_DEMAND'
  const isFillBlank    = t === 'FILL_BLANK'
  const isNumeric      = t === 'NUMERIC'
  const isEquation     = t === 'EQUATION'
  const isComputed     = t === 'COMPUTED'
  const isDisplay      = t === 'DISPLAY'
  const isImage        = t === 'IMAGE'
  const isAudio        = t === 'AUDIO'
  const isVideo        = t === 'VIDEO'
  const isDate         = t === 'DATE'
  const isFileUpload   = t === 'FILE_UPLOAD'
  const isTiming       = t === 'TIMING'
  const isHotspot      = t === 'HOTSPOT'
  const isDragDrop     = t === 'DRAG_DROP'
  const isDropWord     = t === 'DROP_WORD'
  const isHighlight    = t === 'HIGHLIGHT'
  const isMetaInfo     = t === 'META_INFO'
  const isConsent      = t === 'CONSENT'
  const isButtonGroup  = t === 'BUTTON_GROUP'
  const isDrillDown    = t === 'DRILL_DOWN'
  const noInteraction  = isTiming || isMetaInfo
  // TIMING et META_INFO ont leur propre section code — masquer le champ code générique du haut
  const hideTopCode    = isTiming || isMetaInfo

  // ── Validation : code unique dans le bloc (actif si code renseigné) ────────
  const isDuplicateCode = !!form.code && !hideTopCode && blockQuestions.some(
    (q) => q.code === form.code && q.id !== question?.id
  )

  const colCount = Number(form.settings?.columns) || 5

  return (
    <div className={styles.questionForm}>
      <div className={styles.questionFormHeader}>
        <h4 className={styles.questionFormTitle}>{question ? 'Modifier' : 'Nouvel élément'}</h4>
        <button className={styles.cancelBtn} onClick={onCancel}>✕</button>
      </div>

      <div className={styles.questionFormBody}>

        {/* ── TYPE ─────────────────────────────────────────────────────────── */}
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-input" value={form.type} onChange={(e) => setField('type', e.target.value)}>
            {QUESTION_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.types.map((qt) => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {/* ── DESCRIPTION DU TYPE ─────────────────────────────────────────── */}
        {TYPE_DESCRIPTIONS[form.type] && (
          <div className={styles.typeDesc}>{TYPE_DESCRIPTIONS[form.type]}</div>
        )}

        {/* ── CODE ─────────────────────────────────────────────────────────── */}
        {!hideTopCode && (
          <div className="form-group">
            <label className="form-label">
              Code {isDisplayType ? <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(optionnel)</span> : ''}
              {' '}<Tooltip text={isDisplayType ? "Identifiant de cet élément — utile pour le repérer dans le constructeur. Aucune donnée collectée." : "Identifiant dans le fichier de données (ex: Q1, ATT_CC_1)"} />
            </label>
            <input
              className="form-input"
              style={isDuplicateCode ? { borderColor: 'var(--red)' } : {}}
              value={form.code || ''}
              onChange={(e) => setField('code', e.target.value)}
              placeholder={isDisplayType ? 'ex: IMG_intro' : 'ex: Q1'}
            />
            {isDuplicateCode && (
              <span style={{ fontSize: 12, color: 'var(--red)', marginTop: 4, display: 'block' }}>
                Ce code est déjà utilisé dans ce bloc — choisissez un code unique.
              </span>
            )}
          </div>
        )}

        {/* ── TEXTE / CONSIGNE ─────────────────────────────────────────────── */}
        {!isImage && !isAudio && !isVideo && !isTiming && !isMetaInfo && (
          <div className="form-group">
            <label className="form-label">
              {isDisplay ? 'Contenu affiché' : isDragDrop || isDropWord || isHighlight || isFillBlank ? 'Consigne / instruction' : 'Texte de la question'}
            </label>
            <RichEditor
              value={form.text || ''}
              onChange={(v) => setField('text', v)}
              compact={!isDisplay}
            />
          </div>
        )}

        {/* ── TEXTE DE TRAVAIL (HIGHLIGHT / FILL_BLANK) ────────────────────── */}
        {(isHighlight || isFillBlank) && (
          <div className="form-group">
            <label className="form-label">
              {isHighlight ? 'Texte à surligner' : 'Phrase avec trous'}
            </label>
            <textarea
              className="form-input"
              rows={8}
              value={form.settings?.passage || ''}
              onChange={(e) => setSetting('passage', e.target.value)}
              placeholder={isHighlight
                ? 'Collez ici le texte sur lequel les participants doivent travailler…'
                : 'ex : Le [BLANK] se couche sur Nice. Les palmiers sont [BLANK] et grands.'}
              style={{ resize: 'vertical', minHeight: 140 }}
            />
            {isFillBlank && (
              <p style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 4 }}>
                Utilisez <strong>[BLANK]</strong> pour indiquer chaque trou à compléter.
              </p>
            )}
          </div>
        )}

        {/* ── Note affichage sans collecte ─────────────────────────────────── */}
        {DISPLAY_ONLY_TYPES.includes(t) && (
          <div className={styles.infoBox}>Élément d'affichage — aucune donnée collectée.</div>
        )}

        {/* ── Réponse obligatoire ──────────────────────────────────────────── */}
        {!isDisplayType && !noInteraction && (
          <div className={styles.toggleRow}>
            <label className={styles.toggleLabel}>
              Réponse obligatoire <Tooltip text="Le participant ne peut pas continuer sans avoir répondu" />
            </label>
            <Toggle value={form.required} onChange={(v) => setField('required', v)} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            CHOIX (radio, select, checkbox, ranking, drag drop, somme constante)
        ═════════════════════════════════════════════════════════════════════ */}
        {needsChoices && (
          <div className="form-group">
            <label className="form-label">
              {isDragDrop ? 'Éléments à déplacer' : isConstantSum ? 'Options à répartir' : 'Modalités de réponse'}
              {!isDrillDown && <Tooltip text="Code : identifiant dans le CSV. Ancré : la modalité reste en dernière position même avec la randomisation." />}
            </label>
            <div className={styles.choicesList}>
              <div className={styles.choiceHeader}>
                <span className={styles.choiceHeaderCode}>Code</span>
                <span style={{flex:1}}>Libellé</span>
                {hasMedia && <span style={{width:90,fontSize:11,color:'var(--gray-400)'}}>Média</span>}
                {!isDragDrop && !isConstantSum && <span style={{width:50,textAlign:'center',fontSize:11,color:'var(--gray-400)'}}>Ancré</span>}
                <span style={{width:24}}/>
              </div>
              {(form.choices||[]).map((c, i) => (
                <div key={i}>
                  <div className={styles.choiceRow}>
                    <input className={`form-input ${styles.choiceCode}`} value={c.code} onChange={(e) => updateChoice(i,'code',e.target.value)} placeholder="Code" />
                    <input className={`form-input ${styles.choiceLabel}`} value={c.label} onChange={(e) => updateChoice(i,'label',e.target.value)} placeholder="Libellé" />
                    {hasMedia && (
                      <select className="form-input" style={{width:90,fontSize:12,padding:'6px 4px'}} value={c.mediaType||''} onChange={(e) => updateChoice(i,'mediaType',e.target.value)}>
                        <option value="">Aucun</option>
                        <option value="image">Image</option>
                        <option value="audio">Audio</option>
                        <option value="video">Vidéo</option>
                      </select>
                    )}
                    {!isDragDrop && !isConstantSum && (
                      <div style={{width:50,display:'flex',justifyContent:'center'}}>
                        <Toggle value={!!c.anchored} onChange={(v) => updateChoice(i,'anchored',v)} />
                      </div>
                    )}
                    <button className={styles.removeBtn} onClick={() => removeChoice(i)}>✕</button>
                  </div>
                  {hasMedia && c.mediaType && (
                    <div style={{marginLeft:8,marginBottom:6}}>
                      <MediaUrlField
                        value={c.mediaUrl||''}
                        onChange={(url) => updateChoice(i,'mediaUrl',url)}
                        accept={c.mediaType === 'image' ? 'image/*' : c.mediaType === 'audio' ? 'audio/*' : 'video/*'}
                        placeholder={`URL ${c.mediaType === 'image' ? "de l'image" : c.mediaType === 'audio' ? "du fichier audio" : "de la vidéo"}`}
                      />
                    </div>
                  )}
                </div>
              ))}
              {!isConstantSum && (
                <div className={styles.toggleRow} style={{marginTop:4}}>
                  <label className={styles.toggleLabel}>Randomiser l'ordre <Tooltip text="L'ordre des modalités est mélangé pour chaque participant. Les modalités ancrées restent en place." /></label>
                  <Toggle value={form.randomize} onChange={(v) => setField('randomize',v)} />
                </div>
              )}
              <button className={styles.addBtn} onClick={addChoice}>+ Ajouter une modalité</button>
            </div>
          </div>
        )}

        {/* ── Somme constante : total ───────────────────────────────────────── */}
        {isConstantSum && (
          <div className="form-group">
            <label className="form-label">Total à distribuer</label>
            <input className="form-input" type="number" min={1} style={{width:120}} value={form.settings?.total ?? 100} onChange={(e) => setSetting('total', Number(e.target.value))} />
          </div>
        )}

        {/* ── Button group : taille ─────────────────────────────────────────── */}
        {isButtonGroup && (
          <div className="form-group">
            <label className="form-label">Taille des boutons</label>
            <select className="form-input" style={{width:160}} value={form.settings?.size||'md'} onChange={(e) => setSetting('size',e.target.value)}>
              <option value="sm">Petit (sm)</option>
              <option value="md">Moyen (md)</option>
              <option value="lg">Grand (lg)</option>
            </select>
          </div>
        )}

        {/* ── Avec commentaire ─────────────────────────────────────────────── */}
        {hasComment && (
          <div className="form-group">
            <label className="form-label">Libellé du champ commentaire <Tooltip text="Un champ texte libre est ajouté après les choix avec ce libellé." /></label>
            <input className="form-input" value={form.settings?.commentLabel||'Commentaire (facultatif)'} onChange={(e) => setSetting('commentLabel',e.target.value)} />
          </div>
        )}

        {/* ── Drill down : sous-niveaux ─────────────────────────────────────── */}
        {isDrillDown && (form.choices||[]).length > 0 && (
          <div className="form-group">
            <label className="form-label">
              Sous-niveaux (niveau 2)
              <span style={{ fontWeight: 400, color: 'var(--gray-400)', marginLeft: 6, fontSize: 12 }}>
                — pour chaque modalité de niveau 1
              </span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(form.choices||[]).map((c) => {
                const subs = form.settings?.subChoices?.[c.code] || []
                const addSub = () => {
                  const current = form.settings?.subChoices || {}
                  const arr = [...(current[c.code] || [])]
                  arr.push({ code: `${c.code}_${arr.length + 1}`, label: '' })
                  setSetting('subChoices', { ...current, [c.code]: arr })
                }
                const updateSub = (i, field, val) => {
                  const current = form.settings?.subChoices || {}
                  const arr = [...(current[c.code] || [])]
                  arr[i] = { ...arr[i], [field]: val }
                  setSetting('subChoices', { ...current, [c.code]: arr })
                }
                const removeSub = (i) => {
                  const current = form.settings?.subChoices || {}
                  const arr = (current[c.code] || []).filter((_, j) => j !== i)
                  setSetting('subChoices', { ...current, [c.code]: arr })
                }
                return (
                  <div key={c.code} className={styles.drillSubGroup}>
                    <div className={styles.drillSubGroupLabel}>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4 }}>
                        <path d="M2 2h4v4M6 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      {c.label || c.code || '…'}
                    </div>
                    {subs.map((s, i) => (
                      <div key={i} className={styles.choiceRow} style={{ marginLeft: 12 }}>
                        <input
                          className={`form-input ${styles.choiceCode}`}
                          value={s.code}
                          onChange={(e) => updateSub(i, 'code', e.target.value)}
                          placeholder="Code"
                        />
                        <input
                          className={`form-input ${styles.choiceLabel}`}
                          value={s.label}
                          onChange={(e) => updateSub(i, 'label', e.target.value)}
                          placeholder="Libellé du sous-choix"
                        />
                        <button className={styles.removeBtn} onClick={() => removeSub(i)}>✕</button>
                      </div>
                    ))}
                    <button
                      className={styles.addBtn}
                      style={{ marginLeft: 12, marginTop: 4, fontSize: 12 }}
                      onClick={addSub}
                    >
                      + Sous-choix
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Zones DRAG_DROP ───────────────────────────────────────────────── */}
        {isDragDrop && (
          <div className="form-group">
            <label className="form-label">Zones de dépôt (catégories) <Tooltip text="Les participants glissent les éléments ci-dessus vers ces zones." /></label>
            <div className={styles.choicesList}>
              <div className={styles.choiceHeader}>
                <span className={styles.choiceHeaderCode}>Code</span>
                <span style={{flex:1}}>Libellé de la zone</span>
                <span style={{width:24}}/>
              </div>
              {(form.settings?.zones||[]).map((z, i) => (
                <div key={i} className={styles.choiceRow}>
                  <input className={`form-input ${styles.choiceCode}`} value={z.code} onChange={(e) => updateZone(i,'code',e.target.value)} placeholder="zone1" />
                  <input className={`form-input ${styles.choiceLabel}`} value={z.label} onChange={(e) => updateZone(i,'label',e.target.value)} placeholder="ex: Positif" />
                  <button className={styles.removeBtn} onClick={() => removeZone(i)}>✕</button>
                </div>
              ))}
              <button className={styles.addBtn} onClick={addZone}>+ Ajouter une zone</button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            CONSENTEMENT
        ═════════════════════════════════════════════════════════════════════ */}
        {isConsent && (
          <>
            <div className={styles.twoCol}>
              <div className="form-group">
                <label className="form-label">Libellé "Accepter"</label>
                <input className="form-input" value={form.settings?.acceptLabel||"J'accepte"} onChange={(e) => setSetting('acceptLabel',e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Libellé "Refuser"</label>
                <input className="form-input" value={form.settings?.refuseLabel||'Je refuse'} onChange={(e) => setSetting('refuseLabel',e.target.value)} />
              </div>
            </div>
            <div className={styles.infoBox}>Si le participant clique sur "Je refuse" il est automatiquement redirigé vers le bloc Message de fin.</div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            LIKERT SIMPLE
        ═════════════════════════════════════════════════════════════════════ */}
        {isLikert && (
          <>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <div className="form-group" style={{flex:'0 0 auto'}}>
                <label className="form-label">Nombre de points</label>
                <input className="form-input" type="number" min={2} max={20} style={{width:100}} value={form.settings?.points||5} onChange={(e) => setSetting('points',Number(e.target.value))} placeholder="ex: 5" />
              </div>
              <div className="form-group" style={{flex:'0 0 auto'}}>
                <label className="form-label">Valeur de départ <Tooltip text="L'échelle commence à 0 ou à 1." /></label>
                <select className="form-input" style={{width:80}} value={form.settings?.startFrom ?? 1} onChange={(e) => setSetting('startFrom',Number(e.target.value))}>
                  <option value={1}>1</option>
                  <option value={0}>0</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Libellés des points <Tooltip text="Laissez vide les points sans libellé." /></label>
              <div className={styles.likertLabels}>
                {Array.from({ length: form.settings?.points||5 }, (_, i) => (
                  <div key={i} className={styles.likertLabelItem}>
                    <span className={styles.likertPoint}>{i+(form.settings?.startFrom ?? 1)}</span>
                    <input className="form-input" style={{fontSize:13,padding:'8px 12px'}}
                      value={(form.settings?.pointLabels||[])[i]||''}
                      onChange={(e) => {
                        const labels = Array.from({ length: form.settings?.points||5 }, (_, j) => (form.settings?.pointLabels||[])[j]||'')
                        labels[i] = e.target.value; setSetting('pointLabels',labels)
                      }}
                      placeholder={i===0 ? 'ex: Pas du tout' : i===(form.settings?.points||5)-1 ? 'ex: Tout à fait' : ''}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MATRICE LIKERT
        ═════════════════════════════════════════════════════════════════════ */}
        {isMatrix && (
          <>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <div className="form-group" style={{flex:'0 0 auto'}}>
                <label className="form-label">Nombre de colonnes</label>
                <input className="form-input" type="number" min={2} max={20} value={form.settings?.columns||5} onChange={(e) => setSetting('columns',Number(e.target.value))} style={{width:100}} />
              </div>
              <div className="form-group" style={{flex:'0 0 auto'}}>
                <label className="form-label">Valeur de départ <Tooltip text="L'échelle commence à 0 ou à 1." /></label>
                <select className="form-input" style={{width:80}} value={form.settings?.startFrom ?? 1} onChange={(e) => setSetting('startFrom',Number(e.target.value))}>
                  <option value={1}>1</option>
                  <option value={0}>0</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Libellés des colonnes <Tooltip text="Laissez vide pour n'afficher que le numéro." /></label>
              <div className={styles.likertLabels}>
                {getColumnLabels().map((lbl, i) => (
                  <div key={i} className={styles.likertLabelItem}>
                    <span className={styles.likertPoint}>{i+(form.settings?.startFrom ?? 1)}</span>
                    <input className="form-input" style={{fontSize:13,padding:'8px 12px'}} value={lbl} onChange={(e) => updateColumnLabel(i,e.target.value)} placeholder={i===0 ? 'ex: Pas du tout' : i===colCount-1 ? 'ex: Tout à fait' : ''} />
                  </div>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Items de la matrice <Tooltip text="Code : identifiant dans le CSV. Inversé (R) : signale un item à recoder. La valeur exportée reste la valeur brute (non recodée)." /></label>
              <div className={styles.choicesList}>
                <div className={styles.choiceHeader}>
                  <span className={styles.choiceHeaderCode}>Code</span>
                  <span style={{flex:1}}>Libellé</span>
                  <span style={{width:60,textAlign:'center',fontSize:11,color:'var(--gray-400)'}}>Inversé (R)</span>
                  <span style={{width:24}}/>
                </div>
                {(form.matrixItems||[]).map((m, i) => (
                  <div key={i} className={styles.choiceRow}>
                    <input className={`form-input ${styles.choiceCode}`} value={m.code} onChange={(e) => updateMatrixItem(i,'code',e.target.value)} placeholder="item1" />
                    <input className={`form-input ${styles.choiceLabel}`} value={m.label} onChange={(e) => updateMatrixItem(i,'label',e.target.value)} placeholder="ex: Je me sens calme" />
                    <div style={{width:60,display:'flex',justifyContent:'center'}}>
                      <Toggle value={!!m.reversed} onChange={(v) => updateMatrixItem(i,'reversed',v)} />
                    </div>
                    <button className={styles.removeBtn} onClick={() => removeMatrixItem(i)}>✕</button>
                  </div>
                ))}
                <button className={styles.addBtn} onClick={() => addMatrixItem()}>+ Ajouter un item</button>
              </div>
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Randomiser l'ordre des items <Tooltip text="L'ordre des lignes est mélangé pour chaque participant." /></label>
              <Toggle value={form.randomize} onChange={(v) => setField('randomize',v)} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            DIFFÉRENTIEL SÉMANTIQUE
        ═════════════════════════════════════════════════════════════════════ */}
        {isSemanticDiff && (
          <>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <div className="form-group" style={{flex:'0 0 auto'}}>
                <label className="form-label">Nombre de points sur l'échelle</label>
                <input className="form-input" type="number" min={2} max={20} style={{width:100}} value={form.settings?.points||7} onChange={(e) => setSetting('points',Number(e.target.value))} placeholder="ex: 7" />
              </div>
              <div className="form-group" style={{flex:'0 0 auto'}}>
                <label className="form-label">Valeur de départ <Tooltip text="L'échelle commence à 0 ou à 1." /></label>
                <select className="form-input" style={{width:80}} value={form.settings?.startFrom ?? 1} onChange={(e) => setSetting('startFrom',Number(e.target.value))}>
                  <option value={1}>1</option>
                  <option value={0}>0</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Paires d'antonymes <Tooltip text="Pour chaque paire, définissez les deux pôles opposés et un code pour l'export." /></label>
              <div className={styles.choicesList}>
                <div className={styles.choiceHeader}>
                  <span className={styles.choiceHeaderCode}>Code</span>
                  <span style={{flex:1}}>Pôle gauche</span>
                  <span style={{flex:1}}>Pôle droit</span>
                  <span style={{width:24}}/>
                </div>
                {(form.matrixItems||[]).map((m, i) => (
                  <div key={i} className={styles.choiceRow}>
                    <input className={`form-input ${styles.choiceCode}`} value={m.code} onChange={(e) => updateMatrixItem(i,'code',e.target.value)} placeholder="dim1" />
                    <input className={`form-input ${styles.choiceLabel}`} value={m.left||''} onChange={(e) => updateMatrixItem(i,'left',e.target.value)} placeholder="ex: Mauvais" />
                    <input className={`form-input ${styles.choiceLabel}`} value={m.right||''} onChange={(e) => updateMatrixItem(i,'right',e.target.value)} placeholder="ex: Bon" />
                    <button className={styles.removeBtn} onClick={() => removeMatrixItem(i)}>✕</button>
                  </div>
                ))}
                <button className={styles.addBtn} onClick={() => addMatrixItem({left:'',right:''})}>+ Ajouter une paire</button>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SIDE BY SIDE
        ═════════════════════════════════════════════════════════════════════ */}
        {isSideBySide && (
          <>
            <div className={styles.twoCol}>
              <div className="form-group">
                <label className="form-label">Libellé colonne gauche</label>
                <input className="form-input" value={form.settings?.leftLabel||''} onChange={(e) => setSetting('leftLabel',e.target.value)} placeholder="ex: Condition A" />
              </div>
              <div className="form-group">
                <label className="form-label">Libellé colonne droite</label>
                <input className="form-input" value={form.settings?.rightLabel||''} onChange={(e) => setSetting('rightLabel',e.target.value)} placeholder="ex: Condition B" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Points sur l'échelle</label>
              <input className="form-input" type="number" min={2} max={20} value={form.settings?.columns||5} onChange={(e) => setSetting('columns',Number(e.target.value))} style={{width:100}} />
            </div>
            <div className="form-group">
              <label className="form-label">Dimensions à évaluer <Tooltip text="Chaque ligne est une dimension évaluée dans les deux colonnes." /></label>
              <div className={styles.choicesList}>
                <div className={styles.choiceHeader}>
                  <span className={styles.choiceHeaderCode}>Code</span>
                  <span style={{flex:1}}>Libellé de la dimension</span>
                  <span style={{width:24}}/>
                </div>
                {(form.matrixItems||[]).map((m, i) => (
                  <div key={i} className={styles.choiceRow}>
                    <input className={`form-input ${styles.choiceCode}`} value={m.code} onChange={(e) => updateMatrixItem(i,'code',e.target.value)} placeholder="dim1" />
                    <input className={`form-input ${styles.choiceLabel}`} value={m.label} onChange={(e) => updateMatrixItem(i,'label',e.target.value)} placeholder="ex: Crédibilité" />
                    <button className={styles.removeBtn} onClick={() => removeMatrixItem(i)}>✕</button>
                  </div>
                ))}
                <button className={styles.addBtn} onClick={() => addMatrixItem()}>+ Ajouter une dimension</button>
              </div>
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Randomiser l'ordre des dimensions <Tooltip text="L'ordre des lignes est mélangé pour chaque participant." /></label>
              <Toggle value={!!form.randomize} onChange={(v) => setField('randomize', v)} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SLIDER
        ═════════════════════════════════════════════════════════════════════ */}
        {isSlider && (
          <>
            <div className={styles.twoCol}>
              <div className="form-group">
                <label className="form-label">Minimum</label>
                <input className="form-input" type="number" value={form.settings?.min??0} onChange={(e) => setSetting('min',Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Maximum</label>
                <input className="form-input" type="number" value={form.settings?.max??100} onChange={(e) => setSetting('max',Number(e.target.value))} />
              </div>
            </div>
            <div className={styles.twoCol}>
              <div className="form-group">
                <label className="form-label">Label gauche</label>
                <input className="form-input" value={form.settings?.labelLeft||''} onChange={(e) => setSetting('labelLeft',e.target.value)} placeholder="ex: Pas du tout" />
              </div>
              <div className="form-group">
                <label className="form-label">Label droit</label>
                <input className="form-input" value={form.settings?.labelRight||''} onChange={(e) => setSetting('labelRight',e.target.value)} placeholder="ex: Tout à fait" />
              </div>
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Afficher la valeur en temps réel <Tooltip text="Le participant voit le nombre correspondant à la position du curseur." /></label>
              <Toggle value={!!form.settings?.showValue} onChange={(v) => setSetting('showValue',v)} />
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Masquer la position de départ <Tooltip text="Le curseur n'est pas positionné par défaut." /></label>
              <Toggle value={!!form.settings?.hideDefault} onChange={(v) => setSetting('hideDefault',v)} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TEXTE LIBRE
        ═════════════════════════════════════════════════════════════════════ */}
        {isText && (
          <>
            <div className={styles.twoCol}>
              <div className="form-group">
                <label className="form-label">Mots minimum</label>
                <input className="form-input" type="number" min={0} value={form.settings?.minWords??''} onChange={(e) => setSetting('minWords', e.target.value ? Number(e.target.value) : null)} placeholder="Aucun" />
              </div>
              <div className="form-group">
                <label className="form-label">Mots maximum</label>
                <input className="form-input" type="number" min={0} value={form.settings?.maxWords??''} onChange={(e) => setSetting('maxWords', e.target.value ? Number(e.target.value) : null)} placeholder="Aucun" />
              </div>
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Texte long (zone multi-lignes)</label>
              <Toggle value={!!form.settings?.multiline} onChange={(v) => setSetting('multiline',v)} />
            </div>
            <div className="form-group">
              <label className="form-label">Placeholder</label>
              <input className="form-input" value={form.settings?.placeholder||''} onChange={(e) => setSetting('placeholder',e.target.value)} placeholder="ex: Décrivez votre expérience…" />
            </div>
          </>
        )}

        {/* ── Saisie à la demande ───────────────────────────────────────────── */}
        {isInputDemand && (
          <>
            <div className="form-group">
              <label className="form-label">Libellé du déclencheur</label>
              <input className="form-input" value={form.settings?.triggerLabel||'Ajouter un commentaire'} onChange={(e) => setSetting('triggerLabel',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Placeholder du champ</label>
              <input className="form-input" value={form.settings?.placeholder||''} onChange={(e) => setSetting('placeholder',e.target.value)} placeholder="ex: Votre commentaire…" />
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Zone multi-lignes</label>
              <Toggle value={!!form.settings?.multiline} onChange={(v) => setSetting('multiline',v)} />
            </div>
          </>
        )}

        {/* ── Texte à trous ─────────────────────────────────────────────────── */}
        {isFillBlank && (
          <div className={styles.infoBox}>
            Utilisez <strong>[BLANK]</strong> dans le texte pour marquer chaque trou. Ex : <em>Le ciel est [BLANK] et la mer est [BLANK].</em>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            NUMÉRIQUE
        ═════════════════════════════════════════════════════════════════════ */}
        {isNumeric && (
          <>
            <div className={styles.twoCol}>
              <div className="form-group">
                <label className="form-label">Valeur minimum</label>
                <input className="form-input" type="number" value={form.settings?.min??''} onChange={(e) => setSetting('min', e.target.value ? Number(e.target.value) : null)} placeholder="ex: 18" />
              </div>
              <div className="form-group">
                <label className="form-label">Valeur maximum</label>
                <input className="form-input" type="number" value={form.settings?.max??''} onChange={(e) => setSetting('max', e.target.value ? Number(e.target.value) : null)} placeholder="ex: 99" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Message d'erreur personnalisé</label>
              <input className="form-input" value={form.settings?.errorMsg||''} onChange={(e) => setSetting('errorMsg',e.target.value)} placeholder="ex: Veuillez entrer un âge valide (18-99)" />
            </div>
          </>
        )}

        {/* ── Équation ──────────────────────────────────────────────────────── */}
        {isEquation && (
          <>
            <div className="form-group">
              <label className="form-label">Description du calcul attendu</label>
              <input className="form-input" value={form.settings?.description||''} onChange={(e) => setSetting('description',e.target.value)} placeholder="ex: Calcul de l'IMC : poids / taille²" />
            </div>
            <div className="form-group">
              <label className="form-label">Unité affichée</label>
              <input className="form-input" style={{width:120}} value={form.settings?.unit||''} onChange={(e) => setSetting('unit',e.target.value)} placeholder="ex: kg/m²" />
            </div>
          </>
        )}

        {/* ── Calcul automatique ──────────────────────────────────────────────────── */}
        {isComputed && (
          <>
            <div className="form-group">
              <label className="form-label">
                Variables d'entrée
                <Tooltip text="Définissez les valeurs que le participant devra saisir. Le code sera utilisé dans la formule." />
              </label>
              {(form.settings?.variables || []).map((v, i) => (
                <div key={i} style={{ border: '1px solid var(--gray-200)', borderRadius: 8, padding: 10, marginBottom: 8, background: 'var(--gray-50)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 3 }}>Libellé affiché</div>
                      <input
                        className="form-input"
                        value={v.label || ''}
                        onChange={(e) => {
                          const vars = [...(form.settings?.variables || [])]
                          vars[i] = { ...vars[i], label: e.target.value }
                          setSetting('variables', vars)
                        }}
                        placeholder="ex : Distance parcourue"
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => {
                        const vars = (form.settings?.variables || []).filter((_, j) => j !== i)
                        setSetting('variables', vars)
                      }}
                    >✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 3 }}>Code (formule)</div>
                      <input
                        className="form-input"
                        value={v.code || ''}
                        onChange={(e) => {
                          const vars = [...(form.settings?.variables || [])]
                          vars[i] = { ...vars[i], code: e.target.value }
                          setSetting('variables', vars)
                        }}
                        placeholder="distance"
                        style={{ fontFamily: 'monospace', fontSize: 13 }}
                      />
                    </div>
                    <div style={{ width: 90 }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 3 }}>Unité</div>
                      <input
                        className="form-input"
                        value={v.unit || ''}
                        onChange={(e) => {
                          const vars = [...(form.settings?.variables || [])]
                          vars[i] = { ...vars[i], unit: e.target.value }
                          setSetting('variables', vars)
                        }}
                        placeholder="km"
                      />
                    </div>
                    <div style={{ width: 80 }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 3 }}>Min</div>
                      <input
                        className="form-input"
                        type="number"
                        value={v.min ?? ''}
                        onChange={(e) => {
                          const vars = [...(form.settings?.variables || [])]
                          vars[i] = { ...vars[i], min: e.target.value !== '' ? Number(e.target.value) : undefined }
                          setSetting('variables', vars)
                        }}
                        placeholder="—"
                      />
                    </div>
                    <div style={{ width: 80 }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 3 }}>Max</div>
                      <input
                        className="form-input"
                        type="number"
                        value={v.max ?? ''}
                        onChange={(e) => {
                          const vars = [...(form.settings?.variables || [])]
                          vars[i] = { ...vars[i], max: e.target.value !== '' ? Number(e.target.value) : undefined }
                          setSetting('variables', vars)
                        }}
                        placeholder="—"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 4 }}
                onClick={() => setSetting('variables', [...(form.settings?.variables || []), { code: '', label: '', unit: '' }])}
              >
                + Ajouter une variable
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">
                Formule de calcul
                <Tooltip text="Écrivez une expression JavaScript utilisant les codes des variables. Exemples : poids / (taille/100)**2 · distance / temps · (a + b + c) / 3" />
              </label>
              <input
                className="form-input"
                value={form.settings?.formula || ''}
                onChange={(e) => setSetting('formula', e.target.value)}
                placeholder="ex : poids / (taille / 100) ** 2"
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
              <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
                Opérateurs : + − * / ** (puissance) · Fonctions : Math.sqrt() Math.round() Math.abs()
              </div>
            </div>

            <div className={styles.twoCol}>
              <div className="form-group">
                <label className="form-label">Libellé du résultat</label>
                <input
                  className="form-input"
                  value={form.settings?.resultLabel || ''}
                  onChange={(e) => setSetting('resultLabel', e.target.value)}
                  placeholder="ex : Votre IMC"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unité du résultat</label>
                <input
                  className="form-input"
                  value={form.settings?.resultUnit || ''}
                  onChange={(e) => setSetting('resultUnit', e.target.value)}
                  placeholder="ex : kg/m²"
                />
              </div>
            </div>

            <div className={styles.twoCol}>
              <div className="form-group">
                <label className="form-label">Décimales affichées</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  max={6}
                  value={form.settings?.decimals ?? 2}
                  onChange={(e) => setSetting('decimals', Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Afficher le résultat</label>
                <div className={styles.toggleRow} style={{ marginTop: 8 }}>
                  <Toggle
                    value={form.settings?.showResult !== false}
                    onChange={(v) => setSetting('showResult', v)}
                  />
                  <span style={{ fontSize: 12, color: 'var(--gray-500)', marginLeft: 8 }}>
                    {form.settings?.showResult !== false ? 'Visible par le participant' : 'Masqué (collecte silencieuse)'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            IMAGE
        ═════════════════════════════════════════════════════════════════════ */}
        {isImage && (
          <>
            <div className="form-group">
              <label className="form-label">Image</label>
              <MediaUrlField value={form.settings?.url} onChange={(v) => setSetting('url',v)} accept="image/*" placeholder="https://…/image.png" />
            </div>
            <div className="form-group">
              <label className="form-label">Texte alternatif (accessibilité)</label>
              <input className="form-input" value={form.settings?.alt||''} onChange={(e) => setSetting('alt',e.target.value)} placeholder="Description de l'image" />
            </div>
            <div className="form-group">
              <label className="form-label">Légende (optionnel)</label>
              <input className="form-input" value={form.settings?.caption||''} onChange={(e) => setSetting('caption',e.target.value)} placeholder="Texte sous l'image" />
            </div>
            <div className={styles.twoCol}>
              <div className="form-group">
                <label className="form-label">Largeur max (px)</label>
                <input className="form-input" type="number" min={100} value={form.settings?.maxWidth||''} onChange={(e) => setSetting('maxWidth', e.target.value ? Number(e.target.value) : null)} placeholder="ex: 800" />
              </div>
              <div className="form-group">
                <label className="form-label">Durée d'affichage (ms)</label>
                <input className="form-input" type="number" min={0} value={form.settings?.duration||''} onChange={(e) => setSetting('duration', e.target.value ? Number(e.target.value) : null)} placeholder="Illimitée" />
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            AUDIO
        ═════════════════════════════════════════════════════════════════════ */}
        {isAudio && (
          <>
            <div className="form-group">
              <label className="form-label">Fichier audio</label>
              <MediaUrlField value={form.settings?.url} onChange={(v) => setSetting('url',v)} accept="audio/*" placeholder="https://…/audio.mp3" />
            </div>
            <div className="form-group">
              <label className="form-label">Consigne affichée (optionnel)</label>
              <input className="form-input" value={form.text||''} onChange={(e) => setField('text',e.target.value)} placeholder="ex: Écoutez attentivement cet extrait" />
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Afficher les contrôles de lecture</label>
              <Toggle value={!!form.settings?.showControls} onChange={(v) => setSetting('showControls',v)} />
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Lecture automatique</label>
              <Toggle value={!!form.settings?.autoPlay} onChange={(v) => setSetting('autoPlay',v)} />
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Lecture en boucle</label>
              <Toggle value={!!form.settings?.loop} onChange={(v) => setSetting('loop',v)} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VIDÉO
        ═════════════════════════════════════════════════════════════════════ */}
        {isVideo && (
          <>
            <div className="form-group">
              <label className="form-label">Vidéo</label>
              <MediaUrlField value={form.settings?.url} onChange={(v) => setSetting('url',v)} accept="video/*" placeholder="https://…/video.mp4 ou YouTube" />
            </div>
            <div className="form-group">
              <label className="form-label">Consigne affichée (optionnel)</label>
              <input className="form-input" value={form.text||''} onChange={(e) => setField('text',e.target.value)} placeholder="ex: Regardez attentivement cette vidéo" />
            </div>
            <div className="form-group">
              <label className="form-label">Largeur max (px)</label>
              <input className="form-input" type="number" min={200} value={form.settings?.maxWidth||''} onChange={(e) => setSetting('maxWidth', e.target.value ? Number(e.target.value) : null)} placeholder="ex: 900" />
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Afficher les contrôles</label>
              <Toggle value={!!form.settings?.showControls} onChange={(v) => setSetting('showControls',v)} />
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Lecture automatique</label>
              <Toggle value={!!form.settings?.autoPlay} onChange={(v) => setSetting('autoPlay',v)} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            DATE
        ═════════════════════════════════════════════════════════════════════ */}
        {isDate && (() => {
          const fmt      = form.settings?.format || 'date'
          const hasDate  = fmt === 'date' || fmt === 'datetime' || fmt === 'month'
          const hasTime  = fmt === 'time' || fmt === 'datetime'
          const dateMode = form.settings?.dateMode || 'free'
          const timeMode = form.settings?.timeMode || 'free'
          const dateType = fmt === 'month' ? 'month' : 'date'
          return (
            <>
              {/* ── Format ──────────────────────────────────────────────── */}
              <div className="form-group">
                <label className="form-label">Format</label>
                <select className="form-input" value={fmt} onChange={(e) => setSetting('format', e.target.value)}>
                  <option value="date">Date seulement</option>
                  <option value="datetime">Date + heure</option>
                  <option value="time">Heure seulement</option>
                  <option value="month">Mois et année</option>
                </select>
              </div>

              {/* ── Contraintes de date ──────────────────────────────────── */}
              {hasDate && (
                <div className="form-group">
                  <label className="form-label">Contrainte de date</label>
                  <select className="form-input" style={{marginBottom:10}} value={dateMode} onChange={(e) => setSetting('dateMode', e.target.value)}>
                    <option value="free">Libre (aucune contrainte)</option>
                    <option value="range">Fourchette (min / max)</option>
                    <option value="fixed">Date fixe</option>
                  </select>
                  {dateMode === 'range' && (
                    <div className={styles.twoCol}>
                      <div className="form-group">
                        <label className="form-label">{fmt === 'month' ? 'Mois minimal' : 'Date minimale'}</label>
                        <input className="form-input" type={dateType} value={form.settings?.minDate||''} onChange={(e) => setSetting('minDate', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{fmt === 'month' ? 'Mois maximal' : 'Date maximale'}</label>
                        <input className="form-input" type={dateType} value={form.settings?.maxDate||''} onChange={(e) => setSetting('maxDate', e.target.value)} />
                      </div>
                    </div>
                  )}
                  {dateMode === 'fixed' && (
                    <div className="form-group">
                      <label className="form-label">{fmt === 'month' ? 'Mois imposé' : 'Date imposée'}</label>
                      <input className="form-input" type={dateType} value={form.settings?.fixedDate||''} onChange={(e) => setSetting('fixedDate', e.target.value)} style={{maxWidth:200}} />
                    </div>
                  )}
                </div>
              )}

              {/* ── Contraintes d'heure ──────────────────────────────────── */}
              {hasTime && (
                <div className="form-group">
                  <label className="form-label">Contrainte d'heure</label>
                  <select className="form-input" style={{marginBottom:10}} value={timeMode} onChange={(e) => setSetting('timeMode', e.target.value)}>
                    <option value="free">Libre (aucune contrainte)</option>
                    <option value="range">Fourchette (min / max)</option>
                    <option value="fixed">Heure fixe</option>
                  </select>
                  {timeMode === 'range' && (
                    <div className={styles.twoCol}>
                      <div className="form-group">
                        <label className="form-label">Heure minimale</label>
                        <input className="form-input" type="time" value={form.settings?.minTime||''} onChange={(e) => setSetting('minTime', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Heure maximale</label>
                        <input className="form-input" type="time" value={form.settings?.maxTime||''} onChange={(e) => setSetting('maxTime', e.target.value)} />
                      </div>
                    </div>
                  )}
                  {timeMode === 'fixed' && (
                    <div className="form-group">
                      <label className="form-label">Heure imposée</label>
                      <input className="form-input" type="time" value={form.settings?.fixedTime||''} onChange={(e) => setSetting('fixedTime', e.target.value)} style={{maxWidth:160}} />
                    </div>
                  )}
                </div>
              )}
            </>
          )
        })()}

        {/* ═══════════════════════════════════════════════════════════════════
            FILE UPLOAD
        ═════════════════════════════════════════════════════════════════════ */}
        {isFileUpload && (
          <>
            <div className="form-group">
              <label className="form-label">Types de fichiers acceptés</label>
              <input className="form-input" value={form.settings?.accept||''} onChange={(e) => setSetting('accept',e.target.value)} placeholder="ex: .pdf, .docx, image/*" />
            </div>
            <div className="form-group">
              <label className="form-label">Taille maximale (Mo)</label>
              <input className="form-input" type="number" min={1} style={{width:120}} value={form.settings?.maxSizeMb||10} onChange={(e) => setSetting('maxSizeMb',Number(e.target.value))} />
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Autoriser plusieurs fichiers</label>
              <Toggle value={!!form.settings?.multiple} onChange={(v) => setSetting('multiple',v)} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TIMING
        ═════════════════════════════════════════════════════════════════════ */}
        {isTiming && (
          <>
            <div className="form-group">
              <label className="form-label">Code variable</label>
              <input className="form-input" value={form.code||''} onChange={(e) => setField('code',e.target.value)} placeholder="ex: TIME_intro" />
            </div>
            <div className={styles.infoBox}>
              Capture automatiquement le temps passé sur cette page (en millisecondes). Aucune interaction du participant requise.
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            HOT SPOT
        ═════════════════════════════════════════════════════════════════════ */}
        {isHotspot && (
          <>
            <div className="form-group">
              <label className="form-label">Image de fond</label>
              <MediaUrlField value={form.settings?.url} onChange={(v) => setSetting('url', v)} accept="image/*" placeholder="https://…/image.png" />
            </div>
            <div className={styles.twoCol}>
              <div className="form-group">
                <label className="form-label">Largeur max (px)</label>
                <input className="form-input" type="number" value={form.settings?.maxWidth||800} onChange={(e) => setSetting('maxWidth',Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Clics maximum</label>
                <input className="form-input" type="number" min={1} value={form.settings?.maxClicks||1} onChange={(e) => setSetting('maxClicks',Number(e.target.value))} />
              </div>
            </div>
            <div className={styles.infoBox}>Les coordonnées X/Y (en % de l'image) des clics du participant sont enregistrées.</div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            DROP THE WORD
        ═════════════════════════════════════════════════════════════════════ */}
        {isDropWord && (
          <>
            <div className="form-group">
              <label className="form-label">
                Texte à trous <Tooltip text="Le texte affiché au participant. Utilisez [BLANK] pour chaque emplacement à compléter." />
              </label>
              <textarea
                className="form-input"
                rows={7}
                value={form.settings?.passage || ''}
                onChange={(e) => setSetting('passage', e.target.value)}
                placeholder="ex : Le soleil se lève à l'[BLANK] et se couche à l'[BLANK]."
                style={{ resize: 'vertical', minHeight: 130 }}
              />
              <p style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 4 }}>
                Utilisez <strong>[BLANK]</strong> pour chaque trou — les mots de la banque seront glissés dans ces emplacements.
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Banque de mots <Tooltip text="Un mot par ligne. Certains mots sont les bonnes réponses, les autres sont des distracteurs." /></label>
              <textarea className="form-input" rows={8} value={form.settings?.wordBank||''} onChange={(e) => setSetting('wordBank',e.target.value)}
                placeholder={"est\nouest\nnord\nsud\nmatin\nsoir"} style={{resize:'vertical',fontFamily:'monospace',fontSize:13,minHeight:140}} />
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Mélanger les mots</label>
              <Toggle value={!!form.settings?.shuffleWords} onChange={(v) => setSetting('shuffleWords',v)} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SURLIGNAGE
        ═════════════════════════════════════════════════════════════════════ */}
        {isHighlight && (
          <>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>Autoriser plusieurs surlignages</label>
              <Toggle value={form.settings?.multipleSelections !== false} onChange={(v) => setSetting('multipleSelections',v)} />
            </div>
            <div className="form-group">
              <label className="form-label">Couleur de surlignage</label>
              <div className={styles.presetRow}>
                {['#FFEC00','#A8EDAB','#FAB8C4','#A8D4F5'].map((c) => (
                  <button key={c} type="button" onClick={() => setSetting('highlightColor',c)}
                    style={{width:28,height:28,background:c,border: form.settings?.highlightColor===c ? '2px solid #333' : '2px solid #ddd',borderRadius:6,cursor:'pointer'}} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            META INFO
        ═════════════════════════════════════════════════════════════════════ */}
        {isMetaInfo && (
          <>
            <div className="form-group">
              <label className="form-label">Code variable (préfixe)</label>
              <input className="form-input" value={form.code||''} onChange={(e) => setField('code',e.target.value)} placeholder="ex: META" />
            </div>
            <div className={styles.infoBox}>Collecte automatiquement des informations techniques. Aucune interaction du participant requise.</div>
            <div className="form-group">
              <label className="form-label">Informations à collecter</label>
              <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:4}}>
                {[
                  { key:'browser',    label:'Navigateur (nom + version)' },
                  { key:'os',         label:'Système exploitation' },
                  { key:'screen',     label:'Résolution écran' },
                  { key:'language',   label:'Langue du navigateur' },
                  { key:'timezone',   label:'Fuseau horaire' },
                  { key:'deviceType', label:'Type appareil (mobile / desktop)' },
                ].map(({ key, label }) => (
                  <div key={key} className={styles.toggleRow}>
                    <label className={styles.toggleLabel}>{label}</label>
                    <Toggle value={form.settings?.collect?.[key] !== false} onChange={(v) => setSetting('collect', { ...(form.settings?.collect||{}), [key]:v })} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>

      <div className={styles.questionFormActions}>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Annuler</button>
        <button className="btn btn-primary btn-sm" onClick={() => onSave(blockId, form, question?.id)} disabled={isDuplicateCode}>
          {question ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </div>
  )
}

// ─── INSPECTEUR BLOC QUESTION ─────────────────────────────────────────────────

function QuestionBlockInspector({ block, onSaveBlock, onSaveQuestion, onDeleteQuestion, onDuplicateQuestion }) {
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [settings, setSettings] = useState(block.settings || {})
  const [dragQId,     setDragQId]     = useState(null)
  const [dragOverQId, setDragOverQId] = useState(null)

  useEffect(() => { setSettings(block.settings || {}) }, [block.id])

  const handleSaveQuestion = async (blockId, data, questionId) => {
    await onSaveQuestion(blockId, data, questionId)
    setAddingQuestion(false)
    setEditingQuestion(null)
  }

  const handleDragStart = (e, qId) => {
    setDragQId(qId)
    e.dataTransfer.effectAllowed = 'move'
    const ghost = document.createElement('div')
    ghost.style.cssText = 'width:1px;height:1px;opacity:0;position:fixed;top:-100px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  const handleDragOver = (e, qId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (qId !== dragQId) setDragOverQId(qId)
  }

  const handleDrop = (e, targetId) => {
    e.preventDefault()
    if (!dragQId || dragQId === targetId) { setDragQId(null); setDragOverQId(null); return }
    // Partir de l'ordre actuellement affiché (pas block.questions brut)
    const currentIds = sortedQuestions.map((q) => q.id)
    const fromIdx = currentIds.indexOf(dragQId)
    const toIdx   = currentIds.indexOf(targetId)
    const newOrder = [...currentIds]
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, dragQId)
    // Persiste via les settings du bloc (pas besoin de nouvel endpoint)
    const newSettings = { ...block.settings, ...settings, _questionOrder: newOrder }
    setSettings(newSettings)
    onSaveBlock(block.id, newSettings)
    setDragQId(null)
    setDragOverQId(null)
  }

  const handleDragEnd = () => { setDragQId(null); setDragOverQId(null) }

  const stripHtml = (html) => (html || '').replace(/<[^>]+>/g, '').trim()

  // Trier les questions selon l'ordre personnalisé stocké dans settings
  const sortedQuestions = useMemo(() => {
    const qs = block.questions || []
    const order = settings._questionOrder
    if (!order?.length) return qs
    return [...qs].sort((a, b) => {
      const ai = order.indexOf(a.id)
      const bi = order.indexOf(b.id)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [block.questions, settings._questionOrder])

  if (addingQuestion || editingQuestion) {
    return (
      <QuestionForm
        blockId={block.id}
        question={editingQuestion}
        onSave={handleSaveQuestion}
        onCancel={() => { setAddingQuestion(false); setEditingQuestion(null) }}
        blockQuestions={block.questions || []}
      />
    )
  }

  return (
    <div className={styles.inspectorBody}>
      <div className={styles.toggleRow}>
        <label className={styles.toggleLabel}>
          Randomiser l'ordre des éléments
          <Tooltip text="L'ordre d'affichage des éléments de ce bloc sera mélangé pour chaque participant." />
        </label>
        <Toggle
          value={!!settings.randomizeOrder}
          onChange={(v) => {
            const s = { ...block.settings, ...settings, randomizeOrder: v }
            setSettings(s)
            onSaveBlock(block.id, s)
          }}
        />
      </div>

      <div className={styles.sectionLabel}>Éléments ({block.questions?.length || 0})</div>

      <div className={styles.questionsList}>
        {sortedQuestions.map((q) => (
          <div
            key={q.id}
            className={[
              styles.questionItem,
              dragQId     === q.id ? styles.qItemDragging  : '',
              dragOverQId === q.id ? styles.qItemDragOver  : '',
              settings.randomizeOrder ? (q.settings?.anchored ? styles.qItemAnchored : styles.qItemRandom) : '',
            ].filter(Boolean).join(' ')}
            draggable
            onDragStart={(e) => handleDragStart(e, q.id)}
            onDragOver={(e)  => handleDragOver(e, q.id)}
            onDrop={(e)      => handleDrop(e, q.id)}
            onDragEnd={handleDragEnd}
            onDragLeave={() => setDragOverQId(null)}
          >
            {/* Poignée de glissement */}
            <div className={styles.qDragHandle} title="Glisser pour réordonner">
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                <circle cx="2" cy="2"  r="1.2" fill="currentColor"/>
                <circle cx="6" cy="2"  r="1.2" fill="currentColor"/>
                <circle cx="2" cy="7"  r="1.2" fill="currentColor"/>
                <circle cx="6" cy="7"  r="1.2" fill="currentColor"/>
                <circle cx="2" cy="12" r="1.2" fill="currentColor"/>
                <circle cx="6" cy="12" r="1.2" fill="currentColor"/>
              </svg>
            </div>

            {/* Contenu de la question */}
            <div className={styles.questionItemBody}>
              <div className={styles.questionItemInfo}>
                {q.code && <span className={styles.qCode}>{q.code}</span>}
                <span className={styles.qType}>{QUESTION_TYPES.find((qt) => qt.value === q.type)?.label || q.type}</span>
                {q.required && !NO_CODE_TYPES.includes(q.type) && <span className={styles.qRequired}>obligatoire</span>}
                {settings.randomizeOrder && (
                  q.settings?.anchored
                    ? <span className={styles.qAnchored} title="Position fixe lors de la randomisation">📌 ancré</span>
                    : <span className={styles.qRandom} title="L'ordre sera aléatoire pour chaque participant">🔀 random</span>
                )}
              </div>
              {q.text && <p className={styles.qText}>{stripHtml(q.text)}</p>}
              <div className={styles.questionItemActions}>
                {settings.randomizeOrder && (
                  <button
                    className={`btn btn-sm ${q.settings?.anchored ? styles.anchoredBtnActive : 'btn-secondary'}`}
                    onClick={() => {
                      const newSettings = { ...(q.settings || {}), anchored: !q.settings?.anchored }
                      onSaveQuestion(block.id, { ...q, settings: newSettings, choices: q.choices, matrixItems: q.matrixItems }, q.id)
                    }}
                    title={q.settings?.anchored ? 'Position fixe — cliquer pour randomiser' : 'Cliquer pour fixer la position'}
                  >
                    📌 {q.settings?.anchored ? 'Ancré' : 'Ancrer'}
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingQuestion(q)}>Modifier</button>
                <button className="btn btn-secondary btn-sm" onClick={() => onDuplicateQuestion(block.id, q.id)} title="Dupliquer cette question">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{verticalAlign:'middle'}}>
                    <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => onDeleteQuestion(block.id, q.id)}>Supprimer</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setAddingQuestion(true)}>
        + Ajouter un élément
      </button>
    </div>
  )
}

// ─── INSPECTEUR PRINCIPAL ─────────────────────────────────────────────────────

export default function BlockInspector({ block, studyId, onSaveBlock, onSaveQuestion, onDeleteQuestion, onDuplicateQuestion, onReorderQuestion }) {
  const BLOCK_LABELS = {
    WELCOME:     "Message d'accueil",
    INSTRUCTION: 'Instruction',
    QUESTION:    'Questionnaire',
    STIMULUS:    'Tâche',
    LOGIC:       'Logique conditionnelle',
    DEBRIEFING:  'Message de fin',
  }

  const [blockName,    setBlockName]    = useState(block?.settings?.name || '')
  const [editingName,  setEditingName]  = useState(false)
  const [randomGroup,  setRandomGroup]  = useState(block?.settings?.randomGroup || '')

  useEffect(() => {
    setBlockName(block?.settings?.name || '')
    setEditingName(false)
    setRandomGroup(block?.settings?.randomGroup || '')
  }, [block?.id])

  const commitName = () => {
    const trimmed = blockName.trim()
    setEditingName(false)
    onSaveBlock(block.id, { ...block.settings, name: trimmed || null })
  }

  if (!block) {
    return (
      <div className={styles.inspector}>
        <div className={styles.emptyInspector}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="3" y="5" width="22" height="18" rx="3" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M8 10h12M8 14h8M8 18h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <p>Sélectionne un bloc pour le configurer</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.inspector}>
      <div className={styles.inspectorHeader}>
        <div className={styles.inspectorNameWrap}>
          <span className={styles.inspectorTypeTag}>{BLOCK_LABELS[block.type] || block.type}</span>
          {editingName ? (
            <input
              className={styles.blockNameInput}
              value={blockName}
              onChange={(e) => setBlockName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  e.target.blur()
                if (e.key === 'Escape') { setEditingName(false); setBlockName(block?.settings?.name || '') }
              }}
              autoFocus
              placeholder={`Nom du bloc (ex : Bloc intro)`}
            />
          ) : (
            <button className={styles.blockNameBtn} onClick={() => setEditingName(true)} title="Renommer ce bloc">
              {blockName || <span className={styles.blockNamePlaceholder}>Ajouter un nom…</span>}
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" className={styles.editNameIcon}>
                <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
        <a
          href={`/run/${studyId}?preview=1&blockId=${block.id}`}
          target="_blank"
          rel="noreferrer"
          className={styles.previewBlockBtn}
          title="Prévisualiser ce bloc"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        </a>
      </div>
      {/* ── Groupe de randomisation inter-blocs ────────────────────────── */}
      <div className={styles.randomGroupRow}>
        <label className={styles.randomGroupLabel}>
          Groupe de randomisation
          <Tooltip text="Les blocs partageant le même groupe (A, B, C…) verront leur ordre mélangé entre eux pour chaque participant. Laissez vide pour garder ce bloc à sa position fixe." />
        </label>
        <select
          className={`form-input ${styles.randomGroupSelect}`}
          value={randomGroup}
          onChange={(e) => {
            const v = e.target.value
            setRandomGroup(v)
            onSaveBlock(block.id, { ...block.settings, randomGroup: v || null })
          }}
        >
          <option value="">Aucun (position fixe)</option>
          <option value="A">Groupe A</option>
          <option value="B">Groupe B</option>
          <option value="C">Groupe C</option>
          <option value="D">Groupe D</option>
        </select>
      </div>

      {block.type === 'WELCOME'     && <WelcomeInspector     block={block} onSave={onSaveBlock} />}
      {block.type === 'INSTRUCTION' && <InstructionInspector block={block} onSave={onSaveBlock} />}
      {block.type === 'DEBRIEFING'  && <DebriefingInspector  block={block} onSave={onSaveBlock} />}
      {block.type === 'QUESTION'    && (
        <QuestionBlockInspector
          block={block}
          onSaveBlock={onSaveBlock}
          onSaveQuestion={onSaveQuestion}
          onDeleteQuestion={onDeleteQuestion}
          onDuplicateQuestion={onDuplicateQuestion}
        />
      )}
      {block.type === 'STIMULUS' && <StimulusInspector block={block} onSaveBlock={onSaveBlock} />}
      {block.type === 'LOGIC'    && <LogicInspector    block={block} studyId={studyId} onSave={onSaveBlock} />}
    </div>
  )
}
