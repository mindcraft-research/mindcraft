// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── CONVERSION QUALTRICS (.qsf) → STRUCTURE MINDCRAFT ────────────────────────
// Fonctions pures. Transforme un questionnaire Qualtrics exporté (.qsf, JSON)
// en structure au format mindcraft.study.structure 1.1, ensuite importée
// comme n'importe quel fichier (lib/importStructure.js : vérifications,
// nouveaux identifiants, transaction). Aucune réponse n'est jamais lue.
//
// Correspondances :
//   blocs du déroulé (Survey Flow)  → blocs questionnaire, dans l'ordre du
//                                     déroulé ; sauts de page → PAGE_BREAK
//   « Randomizer » : tous les blocs → ordre aléatoire (groupe de randomisation)
//                    un seul bloc   → facteur inter-sujets (un niveau par bloc)
//   « Branch » → fin du questionnaire  → bloc logique « Terminer l'étude »
//   « Branch » → blocs                 → condition ajoutée à leurs questions
//   codes (DataExportTag, valeurs recodées) → conservés
//   logique d'affichage            → conditions d'affichage si simple
//   ${q://QIDn/…} dans les textes  → ${code}
//   traductions                    → traductions (langues connues de MindCraft)
// Ce qui n'a pas d'équivalent est ignoré et signalé (avertissements).

const { LANGUAGE_NAMES } = require('./i18nCatalog')

function estQualtrics(texte) {
  const debut = texte.slice(0, 2000)
  return /^\s*\{\s*"SurveyEntry"\s*:/.test(debut) || (/"SurveyElements"\s*:/.test(texte.slice(0, 200000)) && /"SurveyEntry"/.test(texte.slice(0, 200000)))
}

const MERCI = { fr: 'Merci pour votre participation', en: 'Thank you for your participation', de: 'Vielen Dank für Ihre Teilnahme', es: 'Gracias por su participación', it: 'Grazie per la partecipazione', nl: 'Bedankt voor uw deelname', pt: 'Obrigado pela sua participação' }
const sansHtml = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const deuxLettres = (l) => String(l || '').slice(0, 2).toLowerCase()

// Liste ordonnée d'un objet Qualtrics { id: {Display} } selon un ordre (ou les clés).
function ordonner(objet, ordre) {
  if (!objet || typeof objet !== 'object') return []
  const ids = Array.isArray(ordre) && ordre.length ? ordre.map(String) : Object.keys(objet)
  return ids.filter((id) => objet[id]).map((id) => ({ id, ...objet[id] }))
}

function convertirQualtrics(texte) {
  let q
  try { q = JSON.parse(texte) } catch { throw new Error('Fichier Qualtrics (.qsf) illisible.') }
  const entree = q.SurveyEntry || {}
  const elements = Array.isArray(q.SurveyElements) ? q.SurveyElements : []
  if (!elements.length) throw new Error('Fichier Qualtrics sans contenu (SurveyElements absent).')
  const el = (t) => elements.filter((e) => e.Element === t)
  const langueBase = deuxLettres(entree.SurveyLanguage) || 'en'

  // ── Questions : première passe (codes, types) pour la logique et le piping
  const payloads = new Map() // QID → payload
  for (const e of el('SQ')) if (e.Payload?.QuestionID) payloads.set(e.Payload.QuestionID, e.Payload)
  const recode = (p, id) => {
    const r = p.RecodeValues && typeof p.RecodeValues === 'object' ? p.RecodeValues[id] : undefined
    return r != null && r !== '' ? String(r) : String(id)
  }
  const codeDe = (p) => String(p.DataExportTag || p.QuestionID)
  const typeMc = (p) => {
    if (p.QuestionType !== 'MC') return null
    if (/^(MAVR|MAHR|MACOL|MSB)$/.test(p.Selector)) return 'CHECKBOX'
    if (/^(DL|SB)$/.test(p.Selector)) return 'SELECT'
    if (p.Selector === 'NPS') return 'NPS'
    return 'RADIO'
  }

  // ── Logique Qualtrics → condition MindCraft (ou undefined si impossible)
  const OPS = { EqualTo: 'EQUALS', NotEqualTo: 'NOT_EQUALS', GreaterThan: 'GREATER_THAN', LessThan: 'LESS_THAN', Contains: 'CONTAINS', DoesNotContain: 'NOT_CONTAINS' }
  function expression(x) {
    if (!x || x.LogicType !== 'Question') return undefined
    const m = /^q:\/\/(QID\d+)\/([A-Za-z]+)(?:\/([^/]+))?(?:\/([^/]+))?$/.exec(x.LeftOperand || x.ChoiceLocator || '')
    if (!m) return undefined
    const [, qid, quoi, a, b] = m
    const p = payloads.get(qid)
    if (!p) return undefined
    const code = codeDe(p)
    if (quoi === 'SelectableChoice' && a != null && b == null) {
      const multi = typeMc(p) === 'CHECKBOX'
      const val = recode(p, a)
      if (x.Operator === 'Selected') return [{ sourceCode: code, operator: multi ? 'CONTAINS' : 'EQUALS', value: val }]
      if (x.Operator === 'NotSelected') return [{ sourceCode: code, operator: multi ? 'NOT_CONTAINS' : 'NOT_EQUALS', value: val }]
      return undefined
    }
    // « Nombre de choix cochés > 0 » = au moins une réponse.
    if (quoi === 'SelectedChoicesCount' && a == null) {
      if (x.Operator === 'GreaterThan' && String(x.RightOperand) === '0') return [{ sourceCode: code, operator: 'IS_NOT_EMPTY', value: '' }]
      if (x.Operator === 'GreaterThanOrEqual' && String(x.RightOperand) === '1') return [{ sourceCode: code, operator: 'IS_NOT_EMPTY', value: '' }]
      return undefined
    }
    const source = quoi === 'ChoiceTextEntryValue' && a == null ? code
      : (quoi === 'ChoiceTextEntryValue' || quoi === 'ChoiceNumericEntryValue') && a != null && b == null && p.Selector === 'FORM' ? `${code}_${a}`
        : null
    if (!source) return undefined
    const droite = x.RightOperand != null ? String(x.RightOperand) : ''
    if (x.Operator === 'NotEmpty') return [{ sourceCode: source, operator: 'IS_NOT_EMPTY', value: '' }]
    if (x.Operator === 'GreaterThanOrEqual' || x.Operator === 'LessThanOrEqual') {
      return { ou: [{ sourceCode: source, operator: x.Operator === 'GreaterThanOrEqual' ? 'GREATER_THAN' : 'LESS_THAN', value: droite }, { sourceCode: source, operator: 'EQUALS', value: droite }] }
    }
    return OPS[x.Operator] ? [{ sourceCode: source, operator: OPS[x.Operator], value: droite }] : undefined
  }
  // Renvoie { combinator, conditions } aplati, ou undefined.
  function logique(l) {
    if (!l || typeof l !== 'object') return null
    const morceaux = [] // { conj, conds | ou }
    const groupes = Object.keys(l).filter((k) => /^\d+$/.test(k)).sort((x, y) => x - y)
    for (const g of groupes) {
      const groupe = l[g]
      const exprs = Object.keys(groupe).filter((k) => /^\d+$/.test(k)).sort((x, y) => x - y)
      exprs.forEach((k, i) => {
        const x = groupe[k]
        const conj = i === 0 ? (morceaux.length ? (groupe.Type === 'Or' ? 'OR' : 'AND') : null) : (x.Conjuction === 'Or' ? 'OR' : 'AND')
        morceaux.push({ conj, r: expression(x) })
      })
    }
    if (!morceaux.length) return null
    if (morceaux.some((m) => m.r === undefined)) return undefined
    const liens = new Set(morceaux.slice(1).map((m) => m.conj))
    if (liens.size > 1) return undefined
    const lien = [...liens][0] || 'AND'
    if (morceaux.some((m) => m.r.ou) && (lien === 'AND' && morceaux.length > 1)) return undefined
    const plat = morceaux.flatMap((m) => m.r.ou || m.r)
    const combinator = morceaux.some((m) => m.r.ou) ? 'OR' : lien
    return plat.length === 1 ? plat[0] : { combinator, conditions: plat }
  }
  const etConditions = (a, b) => {
    if (!a) return b
    if (!b) return a
    const liste = (c) => (c.conditions ? (c.combinator === 'OR' ? null : c.conditions) : [c])
    const la = liste(a), lb = liste(b)
    return la && lb ? { combinator: 'AND', conditions: [...la, ...lb] } : undefined
  }

  // ── Piping ${q://QIDn/…} → ${code}
  let insertionsNonReprises = 0
  const piping = (html) => String(html || '').replace(/\$\{([a-z]+):\/\/([^}]*)\}/g, (tout, espace, chemin) => {
    const m = /^(QID\d+)\/(ChoiceGroup\/SelectedChoices|ChoiceTextEntryValue|SelectedChoicesTextEntry|ChoiceGroup\/SelectedAnswers)$/.exec(chemin)
    if (espace === 'q' && m && payloads.has(m[1])) return '${' + codeDe(payloads.get(m[1])) + '}'
    insertionsNonReprises++
    return tout
  })

  // ── Langues
  const langues = new Map() // code Qualtrics (« EN-GB ») → code MindCraft (« en »)
  const languesIgnorees = new Set()
  for (const p of payloads.values()) {
    for (const lq of Object.keys(p.Language && typeof p.Language === 'object' && !Array.isArray(p.Language) ? p.Language : {})) {
      if (langues.has(lq) || languesIgnorees.has(lq)) continue
      const l2 = deuxLettres(lq)
      if (l2 === langueBase) continue
      if (!LANGUAGE_NAMES[l2]) { languesIgnorees.add(lq); continue }
      if ([...langues.values()].includes(l2)) { languesIgnorees.add(lq); continue }
      langues.set(lq, l2)
    }
  }
  const traductions = Object.fromEntries([...langues.values()].map((l) => [l, {}]))
  const traduire = (cle, parLangueQ) => {
    for (const [lq, l2] of langues) {
      const v = parLangueQ(lq)
      if (v != null && String(v).trim() !== '') traductions[l2][cle] = piping(v)
    }
  }
  const tr = (p, lq) => (p.Language && typeof p.Language === 'object' && !Array.isArray(p.Language) ? p.Language[lq] : null) || null

  // ── Conversion d'une question → questions MindCraft
  const ignores = {}
  const noter = (quoi, code) => { (ignores[quoi] ||= []).push(code) }
  let conditionsNonConverties = []
  let matricesRecodees = []

  function convertirQuestion(p, condBranche) {
    const code = codeDe(p)
    const id = `qx-${p.QuestionID}`
    let cond = logique(p.DisplayLogic)
    if (cond === undefined) { conditionsNonConverties.push(code); cond = null }
    if (condBranche) {
      const c = etConditions(condBranche, cond)
      if (c === undefined) conditionsNonConverties.push(code)
      else cond = c
    }
    const requis = p.Validation?.Settings?.ForceResponse === 'ON'
    const base = (extra) => {
      const settings = { ...(extra.settings || {}) }
      if (cond) settings.displayCondition = cond
      return { id: extra.id || id, code: extra.code ?? code, type: extra.type, text: piping(extra.text ?? p.QuestionText ?? ''), required: extra.required ?? requis, randomize: !!extra.randomize, settings, choices: [], matrixItems: [] }
    }
    const traduireTexte = (qm, texteLq = (lq) => tr(p, lq)?.QuestionText) => traduire(`q:${qm.id}:text`, texteLq)
    const choixDe = (qm, avecRecode = true) => ordonner(p.Choices, p.ChoiceOrder).map((c) => {
      const cid = `${qm.id}-c${c.id}`
      if (c.TextEntry === 'on' || c.TextEntry === true) noter('zone de texte d\'un choix (« Autre, précisez »)', code)
      traduire(`q:${qm.id}:c:${cid}`, (lq) => tr(p, lq)?.Choices?.[c.id]?.Display)
      return { id: cid, code: avecRecode ? recode(p, c.id) : String(c.id), label: piping(c.Display ?? ''), anchored: false }
    })
    const melange = p.Randomization && p.Randomization.Type && p.Randomization.Type !== 'None'
    const qt = p.QuestionType

    if (qt === 'MC') {
      const t = typeMc(p)
      if (t === 'NPS') {
        const qm = base({ type: 'LIKERT', settings: { points: 11, startFrom: 0 } })
        traduireTexte(qm)
        return [qm]
      }
      const qm = base({ type: t, randomize: melange })
      qm.choices = choixDe(qm)
      traduireTexte(qm)
      return [qm]
    }
    if (qt === 'TE') {
      const nombre = p.Validation?.Settings?.ContentType === 'ValidNumber'
      if (p.Selector === 'FORM') {
        return ordonner(p.Choices, p.ChoiceOrder).map((c, i) => {
          const num = c.TextEntryValidation === 'ValidNumber'
          const qm = base({ id: `${id}-${c.id}`, code: `${code}_${c.id}`, type: num ? 'NUMERIC' : 'TEXT', text: `${i === 0 ? `${p.QuestionText || ''} ` : ''}${c.Display || ''}` })
          traduireTexte(qm, (lq) => `${i === 0 ? `${tr(p, lq)?.QuestionText || ''} ` : ''}${tr(p, lq)?.Choices?.[c.id]?.Display || ''}`.trim() || null)
          return qm
        })
      }
      const settings = {}
      if (nombre) {
        const v = p.Validation.Settings.ValidNumber || {}
        if (v.Min !== undefined && v.Min !== '' && Number.isFinite(Number(v.Min))) settings.min = Number(v.Min)
        if (v.Max !== undefined && v.Max !== '' && Number.isFinite(Number(v.Max))) settings.max = Number(v.Max)
      } else if (/^(ML|ESTB)$/.test(p.Selector)) settings.multiline = true
      const qm = base({ type: nombre ? 'NUMERIC' : 'TEXT', settings })
      traduireTexte(qm)
      return [qm]
    }
    if (qt === 'Matrix' && p.Selector === 'Likert' && p.SubSelector !== 'MultipleAnswer') {
      const colonnes = ordonner(p.Answers, p.AnswerOrder)
      const qm = base({ type: 'MATRIX', settings: { columns: colonnes.length, columnLabels: colonnes.map((c) => piping(c.Display ?? '')) }, randomize: melange })
      const tags = p.ChoiceDataExportTags && typeof p.ChoiceDataExportTags === 'object' ? p.ChoiceDataExportTags : {}
      qm.matrixItems = ordonner(p.Choices, p.ChoiceOrder).map((c) => {
        const iid = `${id}-r${c.id}`
        traduire(`q:${id}:m:${iid}:label`, (lq) => tr(p, lq)?.Choices?.[c.id]?.Display)
        // Code de la ligne : celui de l'export Qualtrics (« code_ligne »), sans le préfixe.
        const t = tags[c.id] ? String(tags[c.id]).replace(new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_`), '') : String(c.id)
        return { id: iid, code: t, label: piping(c.Display ?? ''), reversed: false }
      })
      colonnes.forEach((c, i) => traduire(`q:${id}:s:columnLabels:${i}`, (lq) => tr(p, lq)?.Answers?.[c.id]?.Display))
      traduireTexte(qm)
      matricesRecodees.push(code)
      return [qm]
    }
    if (qt === 'DB') {
      const qm = base({ type: 'DISPLAY', code: null, required: false })
      traduireTexte(qm)
      return [qm]
    }
    if (qt === 'Slider') {
      const min = Number(p.Configuration?.CSSliderMin), max = Number(p.Configuration?.CSSliderMax)
      return ordonner(p.Choices, p.ChoiceOrder).map((c, i) => {
        const settings = {}
        if (Number.isFinite(min)) settings.min = min
        if (Number.isFinite(max)) settings.max = max
        const qm = base({ id: `${id}-${c.id}`, code: `${code}_${c.id}`, type: 'SLIDER', settings, text: `${i === 0 ? `${p.QuestionText || ''} ` : ''}${c.Display || ''}` })
        traduireTexte(qm, (lq) => `${i === 0 ? `${tr(p, lq)?.QuestionText || ''} ` : ''}${tr(p, lq)?.Choices?.[c.id]?.Display || ''}`.trim() || null)
        return qm
      })
    }
    if (qt === 'RO') {
      const qm = base({ type: 'RANKING' })
      qm.choices = choixDe(qm)
      traduireTexte(qm)
      return [qm]
    }
    if (qt === 'CS') {
      const total = Number(p.Configuration?.ChoicesTotal ?? p.Validation?.Settings?.ChoicesTotal)
      const qm = base({ type: 'CONSTANT_SUM', settings: { total: Number.isFinite(total) && total > 0 ? total : 100 } })
      qm.choices = choixDe(qm, false)
      traduireTexte(qm)
      return [qm]
    }
    if (qt === 'Timing') return [base({ type: 'TIMING', required: false })]
    if (qt === 'Meta') return [base({ type: 'META_INFO', required: false })]
    if (qt === 'FileUpload') {
      const qm = base({ type: 'FILE_UPLOAD', settings: { maxFiles: 1 } })
      traduireTexte(qm)
      return [qm]
    }
    const NOMS = { Matrix: p.SubSelector === 'MultipleAnswer' ? 'matrice à plusieurs réponses par ligne' : p.Selector === 'TE' ? 'matrice de champs texte' : 'matrice de ce type', SBS: 'tableau côte à côte', Draw: 'signature / dessin', HeatMap: 'carte de chaleur', HotSpot: 'zones cliquables', PGR: 'tri en groupes', Captcha: 'captcha', DD: 'liste déroulante en cascade', TreeSelect: 'sélection en arbre', HL: 'surlignage', GAP: 'analyse d\'écart', SS: 'graphique' }
    noter(NOMS[qt] ? `${NOMS[qt]} (${qt}${p.Selector ? '/' + p.Selector : ''})` : `type « ${qt} »`, code)
    return []
  }

  // ── Blocs du déroulé
  const blocsQ = new Map()
  const bl = el('BL')[0]?.Payload
  for (const b of Array.isArray(bl) ? bl : Object.values(bl || {})) if (b?.ID) blocsQ.set(b.ID, b)

  const blocs = []
  const plan = { facteurs: [], niveaux: [] }
  const flux = el('FL')[0]?.Payload?.Flow || []
  let finBlocId = 'qx-fin'
  const autresElements = {}

  function ajouterBloc(idQ, condBranche, randomGroup) {
    const b = blocsQ.get(idQ)
    if (!b || b.Type === 'Trash') return null
    const id = `qx-${b.ID}${blocs.some((x) => x.id === `qx-${b.ID}`) ? `-${blocs.length}` : ''}`
    const settings = { name: sansHtml(b.Description) || `Bloc ${blocs.length + 1}` }
    if (randomGroup) settings.randomGroup = randomGroup
    const opts = b.Options || {}
    if (opts.RandomizeQuestions && opts.RandomizeQuestions !== 'false') settings.randomizeOrder = true
    const questions = []
    let sauts = 0
    for (const e of Array.isArray(b.BlockElements) ? b.BlockElements : []) {
      if (e.Type === 'Page Break') {
        if (questions.length) questions.push({ id: `${id}-saut${++sauts}`, code: null, type: 'PAGE_BREAK', text: '', required: false, settings: {}, choices: [], matrixItems: [] })
        continue
      }
      if (e.Type !== 'Question') continue
      const p = payloads.get(e.QuestionID)
      if (!p) continue
      if (e.SkipLogic) noter('saut de question (« Skip Logic »)', codeDe(p))
      questions.push(...convertirQuestion(p, condBranche))
    }
    while (questions.length && questions[questions.length - 1].type === 'PAGE_BREAK') questions.pop()
    const bloc = { id, type: 'QUESTION', label: settings.name, settings, questions }
    blocs.push(bloc)
    return bloc
  }

  function parcourir(liste, condBranche) {
    for (const f of liste) {
      if (!f || typeof f !== 'object') continue
      if (f.Type === 'Block' || f.Type === 'Standard') ajouterBloc(f.ID, condBranche)
      else if (f.Type === 'Group') parcourir(f.Flow || [], condBranche)
      else if (f.Type === 'Randomizer') {
        const enfants = (f.Flow || []).filter((x) => x.Type === 'Block' || x.Type === 'Standard')
        const n = Number(f.SubSet)
        if (enfants.length !== (f.Flow || []).length) noter('tirage au sort contenant autre chose que des blocs', f.FlowID)
        if (n === 1 && enfants.length > 1) {
          // Un seul bloc tiré : facteur inter-sujets, un niveau par bloc.
          const fid = `qx-f${plan.facteurs.length + 1}`
          plan.facteurs.push({ name: `Tirage ${plan.facteurs.length + 1}`, type: 'BETWEEN', order: plan.facteurs.length, levels: [], _id: fid })
          enfants.forEach((x, i) => {
            const bloc = ajouterBloc(x.ID, condBranche)
            if (bloc) plan.facteurs.at(-1).levels.push({ code: `C${i + 1}`, name: bloc.settings.name, order: i, blockIds: [bloc.id] })
          })
        } else {
          if (n && n < enfants.length) noter(`tirage de ${n} blocs sur ${enfants.length} (tous présentés, dans un ordre aléatoire)`, f.FlowID)
          enfants.forEach((x) => ajouterBloc(x.ID, condBranche, `tirage-${f.FlowID}`))
        }
      } else if (f.Type === 'Branch') {
        const cond = logique(f.BranchLogic)
        const enfants = f.Flow || []
        if (enfants.length === 1 && enfants[0].Type === 'EndSurvey') {
          // « Si … alors fin du questionnaire » → bloc logique « Terminer l'étude ».
          const conds = cond == null ? [] : cond.conditions ? (cond.combinator === 'OR' ? cond.conditions : null) : [cond]
          if (!conds || cond === undefined) { noter('branchement vers la fin trop complexe', f.Description || f.FlowID); continue }
          blocs.push({
            id: `qx-${f.FlowID}`, type: 'LOGIC', label: sansHtml(f.Description) || 'Fin anticipée',
            settings: { rules: conds.map((c) => ({ type: 'RESPONSE_VALUE', sourceQuestionCode: c.sourceCode, operator: c.operator, value: c.value, action: 'END_STUDY' })), defaultAction: 'CONTINUE' },
            questions: [],
          })
          if (conds.some((c) => c.operator === 'IS_NOT_EMPTY')) noter('branchement « est renseigné » (à vérifier)', f.Description || f.FlowID)
        } else {
          if (cond === undefined) noter('condition de branchement non reprise (blocs toujours affichés)', f.Description || f.FlowID)
          const c = cond === undefined ? condBranche : etConditions(condBranche, cond)
          parcourir(enfants, c === undefined ? condBranche : c)
        }
      } else if (f.Type === 'EndSurvey') {
        // Fin explicite du déroulé : rien à faire (le message de fin suit).
      } else {
        autresElements[f.Type] = (autresElements[f.Type] || 0) + 1
      }
    }
  }
  parcourir(flux, null)

  // ── Message de fin
  blocs.push({ id: finBlocId, type: 'DEBRIEFING', label: 'Fin', settings: { title: MERCI[langueBase] || MERCI.en, content: '' }, questions: [] })
  for (const [, l2] of langues) if (MERCI[l2]) traductions[l2][`b:${finBlocId}:title`] = MERCI[l2]

  // Lignes de matrice et blocs sans question
  const vides = blocs.filter((b) => b.type === 'QUESTION' && !b.questions.length)
  for (const b of vides) blocs.splice(blocs.indexOf(b), 1)

  // ── Avertissements
  const avertissements = ['Questionnaire converti depuis Qualtrics : codes d\'export des questions et valeurs des réponses conservés. Vérifiez l\'étude avant de lancer la collecte.']
  const liste = (codes) => `${[...new Set(codes)].slice(0, 8).join(', ')}${new Set(codes).size > 8 ? '…' : ''}`
  for (const [quoi, codes] of Object.entries(ignores)) {
    const aVerifier = /tous présentés|à vérifier|Autre, précisez/.test(quoi)
    avertissements.push(`${aVerifier ? 'À vérifier' : 'Non repris'} — ${quoi} : ${liste(codes)}.`)
  }
  if (conditionsNonConverties.length) avertissements.push(`Conditions trop complexes, non reprises ou reprises en partie : ${liste(conditionsNonConverties)}. À refaire dans MindCraft (sinon ces questions s'affichent plus souvent que prévu).`)
  if (matricesRecodees.length) avertissements.push(`Matrices (${liste(matricesRecodees)}) : MindCraft enregistre le numéro de la colonne (1, 2, 3…), et non la valeur Qualtrics de la réponse.`)
  const nomsElements = { EmbeddedData: 'données intégrées (Embedded Data)', WebService: 'service web', Authenticator: 'authentification', Quota: 'quota', EndSurvey: 'fin du questionnaire', Conjoint: 'analyse conjointe', TableOfContent: 'table des matières' }
  for (const [t, n] of Object.entries(autresElements)) avertissements.push(`Non repris — ${nomsElements[t] || t} dans le déroulé (${n}).`)
  if (insertionsNonReprises) avertissements.push(`${insertionsNonReprises} insertion${insertionsNonReprises > 1 ? 's' : ''} Qualtrics (\${e://…}, \${lm://…}…) sans équivalent laissée${insertionsNonReprises > 1 ? 's' : ''} telle${insertionsNonReprises > 1 ? 's' : ''} quelle${insertionsNonReprises > 1 ? 's' : ''} dans les textes.`)
  if (languesIgnorees.size) avertissements.push(`Traductions non reprises (langue absente de MindCraft ou en double) : ${[...languesIgnorees].join(', ')}.`)

  const metadata = {}
  if (langues.size) metadata.i18n = { defaultLang: langueBase, languages: [...langues.values()], translations: traductions }

  const design = plan.facteurs.length ? {
    designType: 'BETWEEN', counterbalanceMethod: 'RANDOM', quotaMode: 'SOFT', targetN: 30, settings: {},
    factors: plan.facteurs.map(({ _id, ...f }) => f),
  } : null

  const dump = {
    mindcraft: {
      export: {
        // Pas de generatedAt : la date d'export Qualtrics n'est pas connue.
        schemaVersion: '1.1', format: 'mindcraft.study.structure',
        generatedBy: 'Qualtrics (conversion)',
        notes: 'Structure convertie automatiquement depuis un questionnaire Qualtrics (.qsf).',
      },
      study: { name: sansHtml(entree.SurveyName) || 'Questionnaire Qualtrics', description: sansHtml(entree.SurveyDescription).slice(0, 2000) || null, metadata },
      design,
      blocks: blocs.map((b) => ({ ...b, questions: b.questions.map((x) => ({ ...x, choices: x.choices || [], matrixItems: x.matrixItems || [] })), sequenceSteps: [], stimulusFiles: [] })),
    },
  }
  return { dump, avertissements }
}

module.exports = { estQualtrics, convertirQualtrics }
