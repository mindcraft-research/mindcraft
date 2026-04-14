import { useState, useMemo, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { evaluateDisplayCondition } from '../../../lib/logicEvaluator'
import styles from '../runner.module.css'
import RadioQuestion          from '../questions/RadioQuestion'
import CheckboxQuestion       from '../questions/CheckboxQuestion'
import LikertQuestion         from '../questions/LikertQuestion'
import MatrixQuestion         from '../questions/MatrixQuestion'
import SliderQuestion         from '../questions/SliderQuestion'
import TextQuestion           from '../questions/TextQuestion'
import NumericQuestion        from '../questions/NumericQuestion'
import RankingQuestion        from '../questions/RankingQuestion'
import ConsentQuestion        from '../questions/ConsentQuestion'
import HighlightQuestion      from '../questions/HighlightQuestion'
import FillBlankQuestion      from '../questions/FillBlankQuestion'
import DragDropQuestion       from '../questions/DragDropQuestion'
import DrillDownQuestion      from '../questions/DrillDownQuestion'
import DateQuestion           from '../questions/DateQuestion'
import RadioCommentQuestion   from '../questions/RadioCommentQuestion'
import CheckboxCommentQuestion from '../questions/CheckboxCommentQuestion'
import MediaRadioQuestion     from '../questions/MediaRadioQuestion'
import MediaCheckboxQuestion  from '../questions/MediaCheckboxQuestion'
import ConstantSumQuestion    from '../questions/ConstantSumQuestion'
import SideBySideQuestion     from '../questions/SideBySideQuestion'
import DisplayQuestion        from '../questions/DisplayQuestion'
import SelectQuestion         from '../questions/SelectQuestion'
import ComputedQuestion      from '../questions/ComputedQuestion'
import ButtonGroupQuestion   from '../questions/ButtonGroupQuestion'
import SemanticDiffQuestion  from '../questions/SemanticDiffQuestion'
import FileUploadQuestion    from '../questions/FileUploadQuestion'
import HotspotQuestion       from '../questions/HotspotQuestion'
import DropWordQuestion      from '../questions/DropWordQuestion'

const QUESTION_COMPONENTS = {
  // ── Types de base
  RADIO:             RadioQuestion,
  CHECKBOX:          CheckboxQuestion,
  LIKERT:            LikertQuestion,
  MATRIX:            MatrixQuestion,
  SLIDER:            SliderQuestion,
  TEXT:              TextQuestion,
  NUMERIC:           NumericQuestion,
  RANKING:           RankingQuestion,
  CONSENT:           ConsentQuestion,
  // ── Types spécialisés
  SELECT:            SelectQuestion,
  BUTTON_GROUP:      ButtonGroupQuestion,
  MEDIA_RADIO:       MediaRadioQuestion,
  RADIO_COMMENT:     RadioCommentQuestion,
  DRILL_DOWN:        DrillDownQuestion,
  MEDIA_CHECKBOX:    MediaCheckboxQuestion,
  CHECKBOX_COMMENT:  CheckboxCommentQuestion,
  SEMANTIC_DIFF:     SemanticDiffQuestion,
  SIDE_BY_SIDE:      SideBySideQuestion,
  CONSTANT_SUM:      ConstantSumQuestion,
  EQUATION:          NumericQuestion,
  COMPUTED:          ComputedQuestion,
  DATE:              DateQuestion,
  INPUT_DEMAND:      TextQuestion,
  FILL_BLANK:        FillBlankQuestion,
  DROP_WORD:         DropWordQuestion,
  HIGHLIGHT:         HighlightQuestion,
  DRAG_DROP:         DragDropQuestion,
  FILE_UPLOAD:       FileUploadQuestion,
  HOTSPOT:           HotspotQuestion,
  // ── Affichage pur (rendu mais pas de collecte)
  DISPLAY:           DisplayQuestion,
  IMAGE:             DisplayQuestion,
  AUDIO:             DisplayQuestion,
  VIDEO:             DisplayQuestion,
}

// Types sans interaction (affichage pur) : jamais bloquants pour canSubmit
const DISPLAY_TYPES = new Set([
  'DISPLAY', 'IMAGE', 'AUDIO', 'VIDEO',
  'TIMING', 'META_INFO',
])

// Pour les display types, on n'affiche pas le texte de question (il est dans le composant)
const SELF_TITLED_TYPES = new Set(['DISPLAY', 'IMAGE', 'AUDIO', 'VIDEO'])

export default function QuestionBlock({ block, studyId, participantId, onComplete, onSkipToDebriefing, previousResponses = {} }) {
  const questions = useMemo(() => {
    let qs = block.questions || []
    // Respecter l'ordre personnalisé défini dans le constructeur
    const customOrder = block.settings?._questionOrder
    if (customOrder?.length) {
      qs = [...qs].sort((a, b) => {
        const ai = customOrder.indexOf(a.id)
        const bi = customOrder.indexOf(b.id)
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    }
    if (!block.settings?.randomizeOrder) return qs

    // Randomisation sélective : les questions "ancrées" gardent leur position,
    // les autres sont mélangées entre elles et remplissent les positions libres
    const anchored = new Map() // index → question (positions fixes)
    const toShuffle = []       // questions à randomiser

    qs.forEach((q, i) => {
      if (q.settings?.anchored) {
        anchored.set(i, q)
      } else {
        toShuffle.push(q)
      }
    })

    // Si toutes sont ancrées ou aucune à mélanger, retourner tel quel
    if (toShuffle.length <= 1) return qs

    // Fisher-Yates shuffle sur les non-ancrées
    for (let i = toShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]]
    }

    // Reconstruire le tableau : ancrées à leur position, shuffled dans les trous
    const result = new Array(qs.length)
    anchored.forEach((q, i) => { result[i] = q })
    let si = 0
    for (let i = 0; i < result.length; i++) {
      if (!result[i]) { result[i] = toShuffle[si++] }
    }
    return result
  }, [block.id])

  const [responses, setResponses] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [refuseTriggered, setRefuseTriggered] = useState(false)

  const setResponse = (code, val) => setResponses((prev) => ({ ...prev, [code]: val }))

  // Contexte de réponses = réponses des blocs précédents + réponses du bloc courant
  const isQuestionVisible = useCallback((q) => {
    const cond = q.settings?.displayCondition
    if (!cond || !cond.sourceCode) return true
    // Fusionner les réponses précédentes avec les réponses courantes du bloc
    const merged = { ...previousResponses, ...responses }
    return evaluateDisplayCondition(cond, merged)
  }, [responses, previousResponses])

  // Validation : toutes les questions required (et interactives) ont une réponse
  const canSubmit = questions.every((q) => {
    if (!q.required) return true
    if (!isQuestionVisible(q)) return true // masquée par condition → ne pas bloquer
    if (DISPLAY_TYPES.has(q.type)) return true // pas d'interaction → jamais bloquant
    if (!q.code) return true // pas de code → pas de collecte → ne pas bloquer
    if (!QUESTION_COMPONENTS[q.type]) return true // type inconnu → ne pas bloquer
    const val = responses[q.code]
    if (val === undefined || val === null || val === '') return false
    if (Array.isArray(val) && val.length === 0) return false
    // Objets : vérification spécifique par type (pas de rejet générique Object.keys===0)
    if (typeof val === 'object' && !Array.isArray(val)) {
      // RADIO_COMMENT / CHECKBOX_COMMENT : exiger au moins un choix
      if (q.type === 'RADIO_COMMENT')    return !!val.choice
      if (q.type === 'CHECKBOX_COMMENT') return Array.isArray(val.choices) && val.choices.length > 0
      // CONSTANT_SUM : laisser passer (validation interne du composant)
      if (q.type === 'CONSTANT_SUM') return Object.keys(val).length > 0
      // COMPUTED : toutes les variables doivent être remplies
      if (q.type === 'COMPUTED') {
        const vars = q.settings?.variables || []
        return vars.length === 0 || vars.every((v) => val?.[v.code] !== undefined && val?.[v.code] !== '')
      }
    }
    // FILL_BLANK : vérifier que tous les blancs sont remplis
    if (q.type === 'FILL_BLANK') {
      const source = q.settings?.passage || q.text || ''
      const blanks = source.match(/\[BLANK\]/gi) || []
      return blanks.every((_, i) => val[String(i)] && val[String(i)].trim() !== '')
    }
    // DRILL_DOWN : niveau 1 toujours requis ; niveau 2 requis si des sous-choix existent pour ce l1
    if (q.type === 'DRILL_DOWN') {
      if (!val?.l1) return false
      const subs = q.settings?.subChoices?.[val.l1] || []
      if (subs.length > 0 && !val.l2) return false
      return true
    }
    // DRAG_DROP : tous les items doivent être placés dans une zone
    if (q.type === 'DRAG_DROP') {
      const total = (q.choices || []).length
      const placed = Object.values(val).flat().length
      return placed >= total
    }
    return true
  })

  const handleRefuse = () => {
    setRefuseTriggered(true)
    onSkipToDebriefing?.()
  }

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      // Ne pas envoyer les réponses des questions masquées par condition
      const visibleCodes = new Set(questions.filter(q => isQuestionVisible(q)).map(q => q.code))
      const payload = Object.entries(responses)
        .filter(([questionCode]) => visibleCodes.has(questionCode))
        .map(([questionCode, value]) => ({ questionCode, value }))
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/run/${studyId}/responses/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, blockId: block.id, responses: payload }),
      })
    } catch { /* ne pas bloquer */ }
    setSubmitting(false)
    onComplete(responses)
  }

  if (refuseTriggered) return null

  return (
    <div className={styles.card}>
      <div className={styles.questionWrap}>
        {questions.map((q) => {
          const Component = QUESTION_COMPONENTS[q.type]
          if (!Component) return null
          if (!isQuestionVisible(q)) return null
          return (
            <div key={q.id} className={styles.questionItem}>
              {!SELF_TITLED_TYPES.has(q.type) && q.text && (
                <div className={styles.questionText}>
                  <span dangerouslySetInnerHTML={{ __html: typeof window !== 'undefined' ? DOMPurify.sanitize(q.text) : q.text }} />
                  {q.required && <span className={styles.questionRequired}>*</span>}
                </div>
              )}
              <Component
                question={q}
                value={responses[q.code]}
                onChange={(val) => setResponse(q.code, val)}
                onRefuse={q.type === 'CONSENT' ? handleRefuse : undefined}
              />
            </div>
          )
        })}
      </div>
      {/* Pas de bouton si CONSENT seul — le clic sur accept/refuse suffit */}
      {!questions.every((q) => q.type === 'CONSENT') && (
        <button
          className={styles.navBtn}
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? 'Enregistrement…' : 'Continuer'}
        </button>
      )}
      {questions.every((q) => q.type === 'CONSENT') && responses[questions[0]?.code] === 'accept' && (
        <button className={styles.navBtn} onClick={handleSubmit}>
          Continuer
        </button>
      )}
    </div>
  )
}
