import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'
import { evaluateDisplayCondition } from '../../../lib/logicEvaluator'
import { pipeQuestion } from '../../../lib/piping'

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
import WordListQuestion      from '../questions/WordListQuestion'
import RandomCodeQuestion    from '../questions/RandomCodeQuestion'

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
  WORD_LIST:         WordListQuestion,
  RANDOM_CODE:       RandomCodeQuestion,
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

// ─── Items dynamiques (reprise d'une réponse précédente) ─────────────────────
// Une question RANKING (classer) ou MATRIX (juger) peut reprendre comme items
// les mots saisis à une question « Liste de mots » précédente
// (settings.itemsSource.fromCode). On construit alors un item par mot :
//   code/id = w1, w2, … (positions stables → jointure avec la liste de mots)
//   label   = le mot lui-même (affiché au·à la participant·e).
// Les codes stables (et non le mot brut) évitent toute collision si un mot est
// saisi deux fois, et restent cohérents entre le classement et le jugement.
function resolveDynamicItems(q, previousResponses) {
  const fromCode = q.settings?.itemsSource?.fromCode
  if (!fromCode) return q
  const src = previousResponses?.[fromCode]
  const words = Array.isArray(src) ? src.filter((w) => typeof w === 'string' && w.trim() !== '') : []
  const items = words.map((w, i) => ({ id: `w${i + 1}`, code: `w${i + 1}`, label: w }))
  if (q.type === 'MATRIX') return { ...q, matrixItems: items }
  if (q.type === 'RANKING' || q.type === 'DRAG_DROP') return { ...q, choices: items }
  return q
}

// Items de matrice visibles selon leur condition d'affichage (issue #143.10).
// Les conditions par item sont stockées dans settings.itemConditions
// (code item → { sourceCode, operator, value }). Un item sans condition est
// toujours visible. `responses` = contexte fusionné (blocs précédents + bloc
// courant).
function visibleMatrixItems(q, responses) {
  const conds = q?.settings?.itemConditions
  const items = q?.matrixItems || []
  if (!conds) return items
  return items.filter((it) => {
    const c = conds[it.code]
    if (!c || !c.sourceCode) return true
    return evaluateDisplayCondition(c, responses)
  })
}

// ─── StackedStickyManager ────────────────────────────────────────────────────
//
// Quand plusieurs éléments « sticky » (consigne pinnée, item HTML pinné,
// en-tête de matrice pinné) cohabitent dans un même bloc, ils ont tous
// `top: var(--runner-header-height)` — donc ils se collent à la même position
// et se chevauchent. Ce composant invisible scanne le DOM, mesure les hauteurs
// des éléments sticky qui le précèdent en ordre vertical, et applique un
// `top` cumulatif via inline-style.
//
// Approche pragmatique : on assume que tous les sticky d'un même bloc doivent
// rester visibles ensemble (cas typique : consigne en haut + en-tête de
// matrice juste en-dessous). Le navigateur ne le fait pas tout seul ; un peu
// de JS suffit.
function StackedStickyManager() {
  const sentinel = useRef(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = sentinel.current?.parentElement
    if (!root) return

    const apply = () => {
      // Hauteur du header runner (variable CSS), avec fallback à 52px.
      const headerH = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--runner-header-height') || '52',
        10,
      ) || 52

      // Trouver tous les éléments sticky descendants, dans l'ordre du DOM.
      const all = Array.from(root.querySelectorAll('*')).filter((el) => {
        const cs = window.getComputedStyle(el)
        return cs.position === 'sticky'
      })

      let cumulative = headerH
      for (const el of all) {
        // On override le top via inline-style (gagne sur le CSS).
        el.style.top = `${cumulative}px`
        cumulative += el.offsetHeight
      }
    }

    apply()
    // Re-mesurer si le DOM ou la fenêtre changent (contenu dynamique, resize,
    // affichage conditionnel d'une question, etc.).
    const ro = new ResizeObserver(apply)
    ro.observe(root)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [])

  return <span ref={sentinel} style={{ display: 'none' }} aria-hidden="true" />
}

export default function QuestionBlock({ block, studyId, participantId, onComplete, onSkipToDebriefing, previousResponses = {}, isPreview = false, labels = {}, numberQuestions = false, questionNumberOffset = 0 }) {
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
      // Les sauts de page restent à leur position (comme les questions ancrées)
      // pour que la randomisation ne déplace pas les séparateurs de page.
      if (q.settings?.anchored || q.type === 'PAGE_BREAK') {
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

  // Questions avec items dynamiques résolus (RANKING/MATRIX reprenant une
  // « Liste de mots » précédente). Utilisées partout ci-dessous (rendu +
  // validation) pour que choices/matrixItems reflètent les mots du·de la
  // participant·e.
  const resolvedQuestions = useMemo(
    () => questions.map((q) => resolveDynamicItems(q, previousResponses)),
    [questions, previousResponses],
  )

  // Pagination interne au bloc (issue #143, point 9) : les questions de type
  // PAGE_BREAK découpent le bloc en pages successives. Sans saut de page, tout
  // reste sur une seule page (comportement historique).
  const pages = useMemo(() => {
    const out = [[]]
    for (const q of resolvedQuestions) {
      if (q.type === 'PAGE_BREAK') out.push([])
      else out[out.length - 1].push(q)
    }
    const nonEmpty = out.filter((p) => p.length > 0)
    return nonEmpty.length ? nonEmpty : [[]]
  }, [resolvedQuestions])

  const [currentPage, setCurrentPage] = useState(0)
  const pageIdx = Math.min(currentPage, pages.length - 1)
  const pageQuestions = pages[pageIdx] || []
  const isLastPage = pageIdx >= pages.length - 1

  // Contexte de réponses = réponses des blocs précédents + réponses du bloc courant
  const isQuestionVisible = useCallback((q) => {
    const cond = q.settings?.displayCondition
    if (!cond || !cond.sourceCode) return true
    // Fusionner les réponses précédentes avec les réponses courantes du bloc
    const merged = { ...previousResponses, ...responses }
    return evaluateDisplayCondition(cond, merged)
  }, [responses, previousResponses])

  // Validation : retourne true si la question est suffisamment répondue.
  // Centralisée ici pour qu'on puisse à la fois calculer canSubmit ET la
  // liste des questions invalides (pour le surlignage rouge au clic sur
  // le bouton désactivé).
  const isQuestionAnswered = useCallback((q) => {
    if (!q.required) return true
    if (!isQuestionVisible(q)) return true
    if (DISPLAY_TYPES.has(q.type)) return true
    // RANDOM_CODE se remplit tout seul (code généré au montage) → jamais bloquant
    if (q.type === 'RANDOM_CODE') return true
    if (!q.code) return true
    if (!QUESTION_COMPONENTS[q.type]) return true
    // Liste de mots : au moins `minWords` mots non vides.
    if (q.type === 'WORD_LIST') {
      const min = Math.max(1, Number(q.settings?.minWords) || 1)
      const v = responses[q.code]
      return Array.isArray(v) && v.filter((w) => String(w).trim() !== '').length >= min
    }
    // Items dynamiques (reprise) sans aucun mot source → rien à classer/juger.
    if ((q.type === 'RANKING' || q.type === 'MATRIX') && q.settings?.itemsSource?.fromCode) {
      const items = q.type === 'MATRIX' ? (q.matrixItems || []) : (q.choices || [])
      if (items.length === 0) return true
    }
    const val = responses[q.code]
    if (val === undefined || val === null || val === '') return false
    if (Array.isArray(val) && val.length === 0) return false
    if (typeof val === 'object' && !Array.isArray(val)) {
      if (q.type === 'RADIO_COMMENT')    return !!val.choice
      if (q.type === 'CHECKBOX_COMMENT') return Array.isArray(val.choices) && val.choices.length > 0
      if (q.type === 'CONSTANT_SUM') {
        // Option « total exact » (issue #143.8) : la somme distribuée doit
        // égaler le total pour valider ; sinon on accepte une distribution
        // partielle (comportement historique).
        if (q.settings?.enforceTotal) {
          const total = Number(q.settings?.total ?? 100)
          const sum = Object.values(val).reduce((a, v) => a + (Number(v) || 0), 0)
          return sum === total
        }
        return Object.keys(val).length > 0
      }
      if (q.type === 'COMPUTED') {
        const vars = q.settings?.variables || []
        return vars.length === 0 || vars.every((v) => val?.[v.code] !== undefined && val?.[v.code] !== '')
      }
    }
    if (q.type === 'FILL_BLANK') {
      const source = q.settings?.passage || q.text || ''
      const blanks = source.match(/\[BLANK\]/gi) || []
      return blanks.every((_, i) => val[String(i)] && val[String(i)].trim() !== '')
    }
    if (q.type === 'DRILL_DOWN') {
      if (!val?.l1) return false
      const subs = q.settings?.subChoices?.[val.l1] || []
      if (subs.length > 0 && !val.l2) return false
      return true
    }
    if (q.type === 'DRAG_DROP') {
      const total = (q.choices || []).length
      const placed = Object.values(val).flat().length
      return placed >= total
    }
    // MATRIX / SEMANTIC_DIFF : chaque item VISIBLE doit être répondu (les items
    // masqués par condition ne sont pas exigés — issue #143.10).
    if (q.type === 'MATRIX' || q.type === 'SEMANTIC_DIFF') {
      const items = visibleMatrixItems(q, { ...previousResponses, ...responses })
      return items.length === 0 || items.every((it) => {
        const cellVal = val[it.code]
        return cellVal !== undefined && cellVal !== null && cellVal !== ''
      })
    }
    // SIDE_BY_SIDE : chaque item VISIBLE doit être répondu sur les DEUX côtés.
    if (q.type === 'SIDE_BY_SIDE') {
      const items = visibleMatrixItems(q, { ...previousResponses, ...responses })
      return items.length === 0 || items.every((it) => {
        const cellVal = val[it.code]
        return (
          cellVal && typeof cellVal === 'object' &&
          cellVal.left !== undefined && cellVal.left !== '' &&
          cellVal.right !== undefined && cellVal.right !== ''
        )
      })
    }
    return true
  }, [responses, isQuestionVisible])

  // Liste des questions non valides SUR LA PAGE COURANTE (pour valider page
  // par page ; les pages précédentes ont déjà été validées avant d'avancer).
  const invalidQuestionIds = useMemo(
    () => pageQuestions.filter((q) => !isQuestionAnswered(q)).map((q) => q.id),
    [pageQuestions, isQuestionAnswered],
  )
  const canSubmit = invalidQuestionIds.length === 0

  // Quand l'utilisateur·rice tente de soumettre alors qu'il manque des
  // réponses : on affiche les erreurs (contour rouge sur les questions
  // concernées + message au-dessus du bouton) et on scrolle vers la 1re
  // question invalide. Au fur et à mesure que les champs se remplissent,
  // showErrors reste true mais les contours rouges disparaissent
  // automatiquement (invalidQuestionIds se vide).
  const [showErrors, setShowErrors] = useState(false)
  const questionRefs = useRef({})

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
      // En mode prévisualisation chercheur : ne pas enregistrer en base
      // (la garde côté serveur — voir backend/src/routes/run.js — refuse de
      // toute façon les écritures marquées ?preview=1, mais on évite ici
      // une requête réseau inutile et on tient la promesse du bandeau UI).
      if (!isPreview) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/run/${studyId}/responses/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId, blockId: block.id, responses: payload }),
        })
      }
    } catch { /* ne pas bloquer */ }
    setSubmitting(false)
    onComplete(responses)
  }

  if (refuseTriggered) return null

  // Numérotation continue des questions (option « Numéroter les questions »).
  // On numérote, dans l'ordre d'affichage, uniquement les vraies questions
  // visibles (pas les textes/images/sauts de page…), en repartant de l'offset
  // transmis (nombre de questions numérotées dans les blocs précédents).
  const questionNumbers = {}
  if (numberQuestions) {
    let n = questionNumberOffset
    for (const q of questions) {
      const numberable = !DISPLAY_TYPES.has(q.type) && q.type !== 'PAGE_BREAK' && q.type !== 'CONSENT'
      if (numberable && isQuestionVisible(q)) {
        n += 1
        questionNumbers[q.id] = n
      }
    }
  }

  return (
    <div className={styles.card}>
      <StackedStickyManager />
      <div className={styles.questionWrap}>
        {pageQuestions.map((qResolved) => {
          // Piping : remplace les jetons ${CODE} par les réponses déjà données
          // (blocs précédents + réponses courantes du bloc), en direct.
          const ctx = { ...previousResponses, ...responses }
          let q = pipeQuestion(qResolved, ctx)
          // Affichage conditionnel par item (issue #143.10) : on masque les
          // lignes de matrice dont la condition n'est pas remplie.
          if (q.settings?.itemConditions && Array.isArray(q.matrixItems)) {
            q = { ...q, matrixItems: visibleMatrixItems(q, ctx) }
          }
          const Component = QUESTION_COMPONENTS[q.type]
          if (!Component) return null
          if (!isQuestionVisible(q)) return null
          // « Garder visible pendant le défilement » :
          //   - Pour les types « auto-titrés » (DISPLAY/IMAGE/AUDIO/VIDEO),
          //     le contenu EST la consigne — on épingle l'item entier.
          //   - Pour les autres types (matrice, Likert, texte, etc.), seule
          //     la consigne (question.text) est épinglée ; le corps de la
          //     question (la matrice et ses items) défile normalement
          //     en-dessous.
          const isSelfTitled = SELF_TITLED_TYPES.has(q.type)
          const pinTop = !!q.settings?.pinTop
          const itemClass = pinTop && isSelfTitled
            ? `${styles.questionItem} ${styles.questionItemPinned}`
            : styles.questionItem
          const textClass = pinTop && !isSelfTitled
            ? `${styles.questionText} ${styles.questionTextPinned}`
            : styles.questionText
          const isInvalid = showErrors && invalidQuestionIds.includes(q.id)
          const finalItemClass = isInvalid
            ? `${itemClass} ${styles.questionItemError}`
            : itemClass
          return (
            <div
              key={q.id}
              ref={(el) => { questionRefs.current[q.id] = el }}
              className={finalItemClass}
            >
              {!isSelfTitled && q.text && (() => {
                // Injecte le numéro (ex. « 3. ») au début du premier bloc de
                // texte de l'énoncé, pour qu'il apparaisse en ligne avec le texte.
                const num = questionNumbers[q.id]
                let html = q.text
                if (num) {
                  const prefix = `${num}. `
                  html = /^\s*<[a-z]/i.test(html) ? html.replace(/(<[^>]+>)/, `$1${prefix}`) : prefix + html
                }
                return (
                  <div className={textClass}>
                    {q.required && <span className={styles.questionRequired}>*</span>}
                    <div dangerouslySetInnerHTML={{ __html: typeof window !== 'undefined' ? DOMPurify.sanitize(html, { ADD_ATTR: ['style'] }) : html }} />
                  </div>
                )
              })()}
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

      {/* Message d'erreur global quand l'utilisateur·rice tente de continuer
          alors qu'il manque des réponses obligatoires. */}
      {showErrors && !canSubmit && (
        <div className={styles.requiredMissingBanner} role="alert">
          ⚠ Il reste {invalidQuestionIds.length === 1
            ? '1 champ obligatoire'
            : `${invalidQuestionIds.length} champs obligatoires`} à compléter.
        </div>
      )}

      {/* Indicateur de page (uniquement si le bloc est paginé) */}
      {pages.length > 1 && (
        <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--gray-500)', marginBottom: 8 }}>
          Page {pageIdx + 1} / {pages.length}
        </div>
      )}

      {/* Pas de bouton si CONSENT seul — le clic sur accept/refuse suffit */}
      {!questions.every((q) => q.type === 'CONSENT') && (
        <button
          className={styles.navBtn}
          onClick={() => {
            if (!canSubmit) {
              // Le bouton n'est plus désactivé : on signale les manques.
              setShowErrors(true)
              // Scroller vers la 1re question invalide (sous le header sticky).
              const firstId = invalidQuestionIds[0]
              const el = firstId && questionRefs.current[firstId]
              if (el && typeof window !== 'undefined') {
                const headerH = parseInt(
                  getComputedStyle(document.documentElement).getPropertyValue('--runner-header-height') || '52',
                  10,
                ) || 52
                const top = el.getBoundingClientRect().top + window.scrollY - headerH - 16
                window.scrollTo({ top, behavior: 'smooth' })
              }
              return
            }
            // Bloc paginé : avancer à la page suivante avant de soumettre.
            if (!isLastPage) {
              setShowErrors(false)
              setCurrentPage((p) => p + 1)
              if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' })
              return
            }
            handleSubmit()
          }}
          disabled={submitting}
        >
          {submitting ? 'Enregistrement…' : (isLastPage ? (labels.continueLabel || 'Continuer') : (labels.nextLabel || 'Suivant'))}
        </button>
      )}
      {questions.every((q) => q.type === 'CONSENT') && responses[questions[0]?.code] === 'accept' && (
        <button className={styles.navBtn} onClick={handleSubmit}>
          {labels.continueLabel || 'Continuer'}
        </button>
      )}
    </div>
  )
}
