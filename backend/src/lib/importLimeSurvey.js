// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── CONVERSION LIMESURVEY (.lss) → STRUCTURE MINDCRAFT ───────────────────────
// Fonctions pures. Transforme un questionnaire LimeSurvey exporté (.lss, XML)
// en structure au format mindcraft.study.structure 1.1, ensuite importée
// comme n'importe quel fichier (lib/importStructure.js : vérifications,
// nouveaux identifiants, transaction). Les réponses ne sont jamais lues.
//
// Formats pris en charge : LimeSurvey 2.x et 3.x (textes dans les tables
// questions / groups / answers, une ligne par langue) et LimeSurvey 4 à 7
// (textes dans les tables *_l10ns).
//
// Correspondances :
//   groupe de questions        → bloc questionnaire (ordre aléatoire de
//                                groupe → groupe de randomisation)
//   texte d'accueil / de fin   → bloc d'accueil / message de fin
//   codes (questions, réponses, sous-questions) → conservés tels quels
//   conditions (« relevance ») → conditions d'affichage quand l'expression
//                                est simple ; signalées sinon
//   {code} dans les textes     → ${code} (reprise d'une réponse)
//   langues supplémentaires    → traductions
// Ce qui n'a pas d'équivalent est ignoré et signalé (avertissements).

// ─── Lecture du XML ──────────────────────────────────────────────────────────
// Les exports LimeSurvey ont une forme fixe :
//   <table><fields>…</fields><rows><row><champ><![CDATA[valeur]]></champ>…</row></rows></table>
// Un lecteur dédié suffit (pas de dépendance) ; seules ces tables sont lues.

const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
function decoder(brut) {
  let out = ''
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>/g
  let dernier = 0
  let m
  while ((m = re.exec(brut))) {
    out += entites(brut.slice(dernier, m.index)) + m[1]
    dernier = re.lastIndex
  }
  return out + entites(brut.slice(dernier))
}
const entites = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (tout, e) => {
  if (e[0] === '#') {
    const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
    return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''
  }
  return ENTITES[e.toLowerCase()] ?? tout
})

function lireTable(xml, nom) {
  const debut = xml.search(new RegExp(`<${nom}>\\s*<fields>`))
  if (debut < 0) return []
  const fin = xml.indexOf(`</${nom}>`, debut)
  const bloc = xml.slice(debut, fin < 0 ? undefined : fin)
  const rows = /<rows>([\s\S]*)<\/rows>/.exec(bloc)
  if (!rows) return []
  const lignes = []
  for (const r of rows[1].matchAll(/<row>([\s\S]*?)<\/row>/g)) {
    const ligne = {}
    for (const c of r[1].matchAll(/<([A-Za-z0-9_]+)(?:\s*\/>|>((?:<!\[CDATA\[[\s\S]*?\]\]>|[^<])*)<\/\1>)/g)) {
      ligne[c[1]] = c[2] == null ? '' : decoder(c[2])
    }
    lignes.push(ligne)
  }
  return lignes
}

function estLimeSurvey(texte) {
  const debut = texte.slice(0, 3000)
  return /^\s*(?:﻿)?(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<document>/.test(debut) && /<LimeSurveyDocType>/.test(debut)
}

// ─── Types de questions ──────────────────────────────────────────────────────
const NOMS_TYPES = {
  '5': 'choix 5 points', L: 'liste', '!': 'liste déroulante', O: 'liste avec commentaire', M: 'choix multiple',
  P: 'choix multiple avec commentaires', Y: 'oui/non', G: 'genre', I: 'changement de langue', S: 'texte court',
  T: 'texte long', U: 'texte très long', Q: 'textes courts multiples', N: 'nombre', K: 'nombres multiples',
  D: 'date', R: 'classement', X: 'texte affiché', '*': 'équation', '|': 'envoi de fichier',
  A: 'tableau 5 points', B: 'tableau 10 points', C: 'tableau oui/incertain/non', E: 'tableau plus/pareil/moins',
  F: 'tableau', H: 'tableau par colonne', '1': 'tableau à double échelle', ':': 'tableau de nombres', ';': 'tableau de textes',
}
const LIBELLES = {
  fr: { oui: 'Oui', non: 'Non', incertain: 'Incertain', plus: 'Augmentation', pareil: 'Identique', moins: 'Diminution', femme: 'Femme', homme: 'Homme', autre: 'Autre', merci: 'Merci' },
  en: { oui: 'Yes', non: 'No', incertain: 'Uncertain', plus: 'Increase', pareil: 'Same', moins: 'Decrease', femme: 'Female', homme: 'Male', autre: 'Other', merci: 'Thank you' },
  de: { oui: 'Ja', non: 'Nein', incertain: 'Unsicher', plus: 'Zunahme', pareil: 'Gleich', moins: 'Abnahme', femme: 'Weiblich', homme: 'Männlich', autre: 'Sonstiges', merci: 'Vielen Dank' },
}
const libelles = (langue) => LIBELLES[String(langue || '').slice(0, 2)] || LIBELLES.en

// ─── Conditions (« relevance ») ──────────────────────────────────────────────
// Expressions simples seulement : comparaisons « variable opérateur valeur »
// et !is_empty(variable), toutes reliées par ET ou toutes par OU.
const OPERATEURS = { '==': 'EQUALS', eq: 'EQUALS', '!=': 'NOT_EQUALS', ne: 'NOT_EQUALS', '>': 'GREATER_THAN', gt: 'GREATER_THAN', '<': 'LESS_THAN', lt: 'LESS_THAN', '>=': '>=', ge: '>=', '<=': '<=', le: '<=' }

function decouper(expr) {
  const jetons = []
  // Variable : code de question (« age », « loisirs_sport ») ou identifiant
  // technique SGQA (« 146271X12X345 », suivi du code d'une sous-question),
  // qu'écrit l'éditeur de conditions de LimeSurvey. Un nombre suivi de « X »
  // est donc une variable, pas une valeur.
  const re = /\s*(?:(\(|\))|(&&|\|\||\band\b|\bor\b)|(==|!=|>=|<=|>|<|\beq\b|\bne\b|\bge\b|\ble\b|\bgt\b|\blt\b)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(-?\d+(?:\.\d+)?)(?![\dX.])|(!?is_empty)\s*\(\s*((?:\d+X\d+X\d+[A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*)(?:\.[A-Za-z]+)?)\s*\)|((?:\d+X\d+X\d+[A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*)(?:\.[A-Za-z]+)?))\s*/iy
  let i = 0
  while (i < expr.length) {
    re.lastIndex = i
    const m = re.exec(expr)
    if (!m || m[0].length === 0) return null
    i = re.lastIndex
    if (m[1]) jetons.push({ t: m[1] })
    else if (m[2]) jetons.push({ t: 'lien', v: /^(&&|and)$/i.test(m[2]) ? 'AND' : 'OR' })
    else if (m[3]) jetons.push({ t: 'op', v: OPERATEURS[m[3].toLowerCase()] })
    else if (m[4]) jetons.push({ t: 'val', v: m[4].slice(1, -1).replace(/\\(.)/g, '$1') })
    else if (m[5]) jetons.push({ t: 'val', v: m[5] })
    else if (m[6]) jetons.push({ t: 'vide', non: m[6].startsWith('!'), v: m[7] })
    else jetons.push({ t: 'var', v: m[8] })
  }
  return jetons
}

// variables : Map nom EM → { code, sous } (sous : code d'une case cochée).
// Renvoie la condition MindCraft, null si toujours vrai, ou undefined si
// l'expression n'est pas convertible.
function convertirCondition(expr, variables) {
  const e = String(expr ?? '').trim()
  if (e === '' || e === '1') return null
  let jetons = decouper(e)
  if (!jetons) return undefined
  // Parenthèses autour de toute l'expression, souvent doublées par LimeSurvey
  // (« ((a == 1 or a == 2)) ») : sans effet, retirées.
  const fermante = (liste) => {
    let p = 0
    for (let k = 0; k < liste.length; k++) {
      if (liste[k].t === '(') p++
      if (liste[k].t === ')' && --p === 0) return k
    }
    return -1
  }
  while (jetons.length > 2 && jetons[0].t === '(' && fermante(jetons) === jetons.length - 1) jetons = jetons.slice(1, -1)
  const sans = jetons.filter((j) => j.t !== '(' && j.t !== ')')
  // Parenthèses restantes acceptées seulement autour de comparaisons isolées.
  let profondeur = 0
  for (const j of jetons) {
    if (j.t === '(') profondeur++
    if (j.t === ')') profondeur--
    if (profondeur < 0) return undefined
    if (j.t === 'lien' && profondeur > 0) return undefined
  }
  if (profondeur !== 0) return undefined

  const conditions = []
  let lien = null
  let i = 0
  const variable = (nom) => variables.get(String(nom).replace(/\.(NAOK|value|code)$/i, ''))
  while (i < sans.length) {
    const j = sans[i]
    if (j.t === 'vide') {
      if (!j.non) return undefined // is_empty : pas d'équivalent
      const v = variable(j.v)
      if (!v) return undefined
      conditions.push(v.sous ? { sourceCode: v.code, operator: 'CONTAINS', value: v.sous } : { sourceCode: v.code, operator: 'IS_NOT_EMPTY', value: '' })
      i++
    } else if (j.t === 'var' && sans[i + 1]?.t === 'op' && sans[i + 2]?.t === 'val') {
      const v = variable(j.v)
      if (!v) return undefined
      const op = sans[i + 1].v
      const val = sans[i + 2].v
      if (v.sous) {
        // Case d'un choix multiple : « Y » = cochée, « » = non cochée.
        const coche = (op === 'EQUALS' && val === 'Y') || (op === 'NOT_EQUALS' && val === '')
        const pasCoche = (op === 'EQUALS' && val === '') || (op === 'NOT_EQUALS' && val === 'Y')
        if (!coche && !pasCoche) return undefined
        conditions.push({ sourceCode: v.code, operator: coche ? 'CONTAINS' : 'NOT_CONTAINS', value: v.sous })
      } else if (op === '>=' || op === '<=') {
        // « ≥ n » = « > n » OU « = n » : possible seulement seul ou dans un OU.
        conditions.push({ ou: [{ sourceCode: v.code, operator: op === '>=' ? 'GREATER_THAN' : 'LESS_THAN', value: val }, { sourceCode: v.code, operator: 'EQUALS', value: val }] })
      } else {
        conditions.push({ sourceCode: v.code, operator: op, value: val })
      }
      i += 3
    } else return undefined
    if (i < sans.length) {
      if (sans[i].t !== 'lien') return undefined
      if (lien && lien !== sans[i].v) return undefined // ET et OU mélangés
      lien = sans[i].v
      i++
      if (i >= sans.length) return undefined
    }
  }
  if (conditions.some((c) => c.ou)) {
    if (lien === 'AND' && conditions.length > 1) return undefined
    const plat = conditions.flatMap((c) => c.ou || [c])
    return plat.length === 1 ? plat[0] : { combinator: 'OR', conditions: plat }
  }
  if (conditions.length === 1) return conditions[0]
  return { combinator: lien === 'OR' ? 'OR' : 'AND', conditions }
}

// Deux conditions qui doivent être vraies ensemble (groupe ET question).
function etConditions(a, b) {
  if (!a) return b
  if (!b) return a
  const liste = (c) => (c.conditions ? (c.combinator === 'OR' ? null : c.conditions) : [c])
  const la = liste(a), lb = liste(b)
  if (!la || !lb) return undefined
  return { combinator: 'AND', conditions: [...la, ...lb] }
}

// ─── Conversion ──────────────────────────────────────────────────────────────
// fichiers : Map(chemin → contenu) des autres fichiers de l'archive (images).
// Renvoie { dump, avertissements, medias } ; medias : Map(« medias/<nom> » →
// contenu) des images reprises, à importer avec la structure.
function convertirLimeSurvey(xml, { fichiers = null } = {}) {
  const type = /<LimeSurveyDocType>([^<]*)<\/LimeSurveyDocType>/.exec(xml)?.[1]
  if (type !== 'Survey') throw new Error(type ? `Fichier LimeSurvey de type « ${type} » : seul un questionnaire complet (.lss) peut être importé.` : 'Fichier LimeSurvey illisible.')
  const dbVersion = /<DBVersion>(\d+)<\/DBVersion>/.exec(xml)?.[1] || '?'

  const tables = new Map()
  const t = (nom) => {
    if (!tables.has(nom)) tables.set(nom, lireTable(xml, nom))
    return tables.get(nom)
  }
  const enquete = t('surveys')[0] || {}
  const langue = enquete.language || 'en'
  const autres = String(enquete.additional_languages || '').split(/\s+/).filter((l) => l && l !== langue)
  const L = libelles(langue)
  const avert = []
  const signaler = (cle, quoi) => { avert[cle] = avert[cle] || []; if (quoi != null) avert[cle].push(quoi) }

  // Textes par langue (formats ≥ 4 : tables *_l10ns ; sinon colonne language).
  const parLangue = (lignes, cle) => {
    const m = new Map()
    for (const l of lignes) m.set(`${l[cle]}|${l.language || langue}`, l)
    return m
  }
  const qL10n = parLangue(t('question_l10ns'), 'qid')
  const gL10n = parLangue(t('group_l10ns'), 'gid')
  const aL10n = parLangue(t('answer_l10ns'), 'aid')
  const reglagesLangue = new Map(t('surveys_languagesettings').map((l) => [l.surveyls_language, l]))

  const unParId = (lignes, cle) => {
    const m = new Map()
    for (const l of lignes) {
      const deja = m.get(l[cle])
      if (!deja || (l.language === langue && deja.language !== langue)) m.set(l[cle], l)
    }
    return m
  }
  const lignesQuestions = [...t('questions'), ...t('subquestions')]
  const toutesQuestions = unParId(lignesQuestions, 'qid')
  const texteQ = (qid, lg = langue) => {
    const l10 = qL10n.get(`${qid}|${lg}`)
    if (l10) return { question: l10.question || '', help: l10.help || '' }
    const l = lignesQuestions.find((x) => x.qid === qid && (x.language || langue) === lg)
    return l ? { question: l.question || '', help: l.help || '' } : null
  }
  const groupes = [...unParId(t('groups'), 'gid').values()].sort((a, b) => Number(a.group_order) - Number(b.group_order))
  const texteG = (gid, lg = langue) => {
    const l10 = gL10n.get(`${gid}|${lg}`)
    if (l10) return { nom: l10.group_name || '', description: l10.description || '' }
    const l = t('groups').find((x) => x.gid === gid && (x.language || langue) === lg)
    return l ? { nom: l.group_name || '', description: l.description || '' } : null
  }
  // Réponses : une ligne par (question, code, échelle) ; texte par langue.
  const reponses = new Map() // qid → [{ id, code, scale, ordre, textes: {lg: texte} }]
  for (const a of t('answers')) {
    const cle = `${a.qid}|${a.scale_id || 0}|${a.code}`
    let liste = reponses.get(a.qid)
    if (!liste) reponses.set(a.qid, (liste = []))
    let r = liste.find((x) => x.cle === cle)
    if (!r) liste.push((r = { cle, id: a.aid || cle, code: a.code, scale: Number(a.scale_id || 0), ordre: Number(a.sortorder || 0), textes: {} }))
    if (a.answer != null) r.textes[a.language || langue] = a.answer
    else if (a.aid) for (const lg of [langue, ...autres]) { const l10 = aL10n.get(`${a.aid}|${lg}`); if (l10) r.textes[lg] = l10.answer || '' }
  }
  for (const liste of reponses.values()) liste.sort((a, b) => a.ordre - b.ordre)
  const attributs = new Map() // qid → { attribut: valeur } (langue de base ou sans langue)
  for (const a of t('question_attributes')) {
    if (a.language && a.language !== langue) continue
    const m = attributs.get(a.qid) || {}
    m[a.attribute] = a.value
    attributs.set(a.qid, m)
  }

  const principales = [...toutesQuestions.values()].filter((q) => !q.parent_qid || q.parent_qid === '0')
  const sousQuestions = (qid, scale = null) => [...toutesQuestions.values()]
    .filter((q) => q.parent_qid === qid && (scale == null || Number(q.scale_id || 0) === scale))
    .sort((a, b) => Number(a.question_order) - Number(b.question_order))

  // Variables utilisables dans les conditions (nom EM → code MindCraft).
  const variables = new Map()
  for (const q of principales) {
    if (['M', 'P'].includes(q.type)) for (const s of sousQuestions(q.qid)) variables.set(`${q.title}_${s.title}`, { code: q.title, sous: s.title })
    else if (['Q', 'K'].includes(q.type)) for (const s of sousQuestions(q.qid)) variables.set(`${q.title}_${s.title}`, { code: `${q.title}_${s.title}` })
    else if (!['F', 'A', 'B', 'C', 'E', 'H', '1', ':', ';', 'X'].includes(q.type)) variables.set(q.title, { code: q.title })
  }
  // Mêmes variables sous leur identifiant SGQA (<sid>X<gid>X<qid>, + code de la
  // sous-question), utilisé par l'éditeur de conditions et {INSERTANS:…}.
  const sid = enquete.sid || principales[0]?.sid || ''
  for (const q of principales) {
    const sgqa = `${q.sid || sid}X${q.gid}X${q.qid}`
    if (['M', 'P', 'Q', 'K'].includes(q.type)) {
      for (const s of sousQuestions(q.qid)) { const v = variables.get(`${q.title}_${s.title}`); if (v) variables.set(`${sgqa}${s.title}`, v) }
    } else if (variables.has(q.title)) variables.set(sgqa, variables.get(q.title))
  }
  const codesConnus = new Set([...variables.values()].map((v) => v.code))

  // {code} / {code.shown} / {INSERTANS:…} → ${code} ; autres jetons LimeSurvey
  // signalés. MindCraft réaffiche la valeur enregistrée : pour une question à
  // choix, le code de la réponse (LimeSurvey, avec .shown, montre son libellé).
  let jetonsNonRepris = 0
  let formules = 0
  let libellesEnCode = new Set()
  const TYPES_A_CHOIX = ['L', '!', 'O', 'M', 'P', 'Y', 'G', 'R']
  const typeParCode = new Map(principales.map((q) => [q.title, q.type]))
  const piping = (html) => { formules += (String(html || '').match(/\{[A-Za-z_]+\(/g) || []).length; return pipingSimple(html) }
  const pipingSimple = (html) => String(html || '').replace(/\{(INSERTANS:)?((?:\d+X\d+X\d+[A-Za-z0-9_]*)|[A-Za-z_][A-Za-z0-9_]*)(\.(?:shown|NAOK|value))?\}/g, (tout, insertans, nom, suffixe) => {
    const cible = codesConnus.has(nom) ? nom : variables.get(nom)?.code
    if (!cible) { jetonsNonRepris++; return tout }
    if ((insertans || suffixe === '.shown') && TYPES_A_CHOIX.includes(typeParCode.get(cible))) libellesEnCode.add(cible)
    return '${' + cible + '}'
  })

  // ── Images. Archive .zip (le .lss et les images, ex. export des « ressources »
  // du questionnaire) : une image d'un texte devient une question « Image » à
  // sa place, une réponse-image un choix avec image. Les images sont reconnues
  // par leur nom de fichier ; celles qui manquent sont signalées.
  const EXT_IMAGES = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
  const extension = (nom) => (/\.[a-z0-9]+$/.exec(nom) || [''])[0]
  const nomDe = (src) => {
    const brut = String(src || '').split(/[?#]/)[0].split(/[\\/]/).pop() || ''
    try { return decodeURIComponent(brut).toLowerCase() } catch { return brut.toLowerCase() }
  }
  const imagesZip = new Map() // nom de fichier (minuscules) → contenu
  for (const [chemin, contenu] of fichiers || []) {
    const nom = nomDe(chemin)
    if (EXT_IMAGES.includes(extension(nom)) && !imagesZip.has(nom)) imagesZip.set(nom, contenu)
  }
  const medias = new Map() // « medias/<nom> » → contenu (repris par l'import)
  const choixImages = new Map() // code → { multi, choix: [{ code, url }] } (réponses-images reprises)
  const nomsMedias = new Map()
  const imagesAbsentes = new Set()
  const media = (src) => {
    const nom = nomDe(src)
    if (!nom) return null
    if (!EXT_IMAGES.includes(extension(nom)) || !imagesZip.has(nom)) { imagesAbsentes.add(nom); return null }
    if (!nomsMedias.has(nom)) {
      const ext = extension(nom)
      const sur = `ls${nomsMedias.size + 1}-${nom.slice(0, -ext.length).replace(/[^a-z0-9_-]/g, '_').slice(0, 80)}${ext}`
      nomsMedias.set(nom, sur)
      medias.set(`medias/${sur}`, imagesZip.get(nom))
    }
    return `/api/media/files/${nomsMedias.get(nom)}`
  }
  const RE_IMG = /<img\b[^>]*>/gi
  const attribut = (balise, nom) => {
    const m = new RegExp(`\\b${nom}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(balise)
    return m ? (m[1] ?? m[2] ?? m[3] ?? '') : ''
  }
  const sansImages = (html) => String(html || '').replace(RE_IMG, '')
  const estVide = (html) => !String(html || '').replace(/<[^>]*>|&nbsp;|\s/g, '')
  // Texte HTML → morceaux ordonnés : { html } et { src, alt }.
  const decouper = (html) => {
    const s = String(html || '')
    const morceaux = []
    let dernier = 0
    for (const m of s.matchAll(RE_IMG)) {
      morceaux.push({ html: s.slice(dernier, m.index) })
      morceaux.push({ src: attribut(m[0], 'src'), alt: attribut(m[0], 'alt') })
      dernier = m.index + m[0].length
    }
    morceaux.push({ html: s.slice(dernier) })
    return morceaux
  }
  const questionImage = (id, src, alt, cond) => {
    const url = media(src)
    if (!url) return null
    const settings = { url, alt: alt || '', maxWidth: 800 }
    if (cond) settings.displayCondition = cond
    return { id, code: null, type: 'IMAGE', text: '', required: false, settings, choices: [], matrixItems: [] }
  }

  const traductions = Object.fromEntries(autres.map((lg) => [lg, {}]))
  const traduire = (cle, parLg) => {
    for (const lg of autres) if (parLg[lg] != null && parLg[lg] !== '') traductions[lg][cle] = piping(sansImages(parLg[lg]))
  }
  // Texte affiché (avec images) → questions « Texte » et « Image » dans l'ordre.
  // htmlParLangue : (lg) → texte traduit, découpé de la même façon.
  // Réponse affichée plus loin ({voiture.shown}, {INSERTANS:…}) d'une question
  // à réponses-images : l'image du choix fait, à la place du jeton (une
  // question « Image » par choix, affichée seulement pour le choix fait).
  const RE_REPONSE = /\{(?:INSERTANS:(\d+X\d+X\d+[A-Za-z0-9_]*)|((?:\d+X\d+X\d+[A-Za-z0-9_]*)|[A-Za-z_][A-Za-z0-9_]*)\.shown)\}/g
  const avecReponses = (morceaux) => morceaux.flatMap((m) => {
    if (m.html == null) return [m]
    const out = []
    let dernier = 0
    for (const r of m.html.matchAll(RE_REPONSE)) {
      const code = variables.get(r[1] || r[2])?.code
      if (!code || !choixImages.has(code)) continue
      out.push({ html: m.html.slice(dernier, r.index) }, { reponse: code })
      dernier = r.index + r[0].length
    }
    out.push({ html: m.html.slice(dernier) })
    return out
  })
  const texteAffiche = (idBase, html, htmlParLangue, { code = null, cond = null } = {}) => {
    const morceaux = avecReponses(decouper(html))
    const sortie = []
    let n = 0
    const parLangue = Object.fromEntries(autres.map((lg) => [lg, avecReponses(decouper(htmlParLangue(lg))).filter((m) => m.html != null).map((m) => m.html)]))
    const textesBase = morceaux.filter((m) => m.html != null)
    morceaux.forEach((m, i) => {
      if (m.reponse) {
        const { multi, choix } = choixImages.get(m.reponse)
        for (const c of choix) {
          const choisi = { sourceCode: m.reponse, operator: multi ? 'CONTAINS' : 'EQUALS', value: c.code }
          const settings = { url: c.url, alt: '', maxWidth: 800, displayCondition: etConditions(cond, choisi) || choisi }
          sortie.push({ id: `${idBase}-rep${i}-${c.code}`, code: null, type: 'IMAGE', text: '', required: false, settings, choices: [], matrixItems: [] })
        }
      } else if (m.html != null) {
        const iTexte = textesBase.indexOf(m)
        if (estVide(m.html)) return
        const id = sortie.length || morceaux.length > 1 ? `${idBase}-${++n}` : idBase
        const settings = cond ? { displayCondition: cond } : {}
        sortie.push({ id, code: sortie.some((x) => x.code) ? null : code, type: 'DISPLAY', text: piping(m.html), required: false, settings, choices: [], matrixItems: [] })
        traduire(`q:${id}:text`, Object.fromEntries(autres.map((lg) => [lg, parLangue[lg].length === textesBase.length ? parLangue[lg][iTexte] : (iTexte === 0 ? htmlParLangue(lg) : null)])))
      } else {
        const qi = questionImage(`${idBase}-img${i}`, m.src, m.alt, cond)
        if (qi) sortie.push(qi)
      }
    })
    return sortie
  }
  const texteDans = (qid, lg) => texteQ(qid, lg)?.question

  const blocs = []
  let conditionsNonConverties = []
  let conditionsGroupeNonConverties = []

  // ── Accueil
  const rl = reglagesLangue.get(langue) || {}
  const titre = rl.surveyls_title || ''
  if (rl.surveyls_welcometext || rl.surveyls_description) {
    const id = 'ls-accueil'
    blocs.push({ id, type: 'WELCOME', label: 'Accueil', settings: { title: titre, content: piping(rl.surveyls_welcometext || rl.surveyls_description) }, questions: [] })
    traduire(`b:${id}:title`, Object.fromEntries(autres.map((lg) => [lg, reglagesLangue.get(lg)?.surveyls_title])))
    traduire(`b:${id}:content`, Object.fromEntries(autres.map((lg) => [lg, reglagesLangue.get(lg)?.surveyls_welcometext || reglagesLangue.get(lg)?.surveyls_description])))
  }

  // ── Groupes → blocs questionnaire
  const ignores = {}
  // Images de l'accueil et de la fin : ces blocs n'affichent pas d'image.
  for (const [quoi, html] of [['accueil', rl.surveyls_welcometext || rl.surveyls_description], ['fin', rl.surveyls_endtext]]) {
    if (/<img\b/i.test(html || '')) (ignores['images du message d\'accueil ou de fin (à ajouter dans un bloc questionnaire)'] ||= []).push(quoi)
  }
  const tableauxRecodes = []
  for (const g of groupes) {
    const tg = texteG(g.gid) || { nom: '', description: '' }
    const idBloc = `ls-g${g.gid}`
    const reglages = { name: tg.nom || `Groupe ${g.group_order}` }
    if (g.randomization_group) reglages.randomGroup = g.randomization_group
    const bloc = { id: idBloc, type: 'QUESTION', label: tg.nom || null, settings: reglages, questions: [] }
    const condGroupe = convertirCondition(g.grelevance, variables)
    if (condGroupe === undefined) conditionsGroupeNonConverties.push(tg.nom || g.gid)

    if (tg.description && (!estVide(tg.description) || /<img\b/i.test(tg.description))) {
      bloc.questions.push(...texteAffiche(`ls-g${g.gid}-description`, tg.description, (lg) => texteG(g.gid, lg)?.description))
    }

    const qs = principales.filter((q) => q.gid === g.gid).sort((a, b) => Number(a.question_order) - Number(b.question_order))
    for (const q of qs) {
      const at = attributs.get(q.qid) || {}
      let tq = texteQ(q.qid) || { question: '', help: '' }
      if (at.hidden === '1') { (ignores['question masquée'] ||= []).push(q.title); continue }
      if (['*', 'I', ':', ';'].includes(q.type)) { (ignores[NOMS_TYPES[q.type]] ||= []).push(q.title); continue }
      if (!NOMS_TYPES[q.type]) { (ignores[`type « ${q.type} »`] ||= []).push(q.title); continue }

      let cond = convertirCondition(q.relevance, variables)
      if (cond === undefined) { conditionsNonConverties.push(q.title); cond = null }
      if (condGroupe) {
        const c = etConditions(condGroupe, cond)
        if (c === undefined) conditionsNonConverties.push(q.title)
        else cond = c
      }

      // Images de l'énoncé : questions « Image » juste avant la question (le
      // texte d'affichage « X » est découpé dans l'ordre, plus bas).
      if (q.type !== 'X' && /<img\b/i.test(tq.question)) {
        decouper(tq.question).forEach((m, i) => {
          if (m.src == null) return
          const qi = questionImage(`ls-q${q.qid}-img${i}`, m.src, m.alt, cond)
          if (qi) bloc.questions.push(qi)
        })
        tq = { ...tq, question: sansImages(tq.question) }
      }

      const base = (id, extra = {}) => {
        const settings = { ...(extra.settings || {}) }
        if (tq.help && tq.help.replace(/<[^>]*>|&nbsp;|\s/g, '')) settings.description = piping(tq.help).replace(/<[^>]*>/g, '').trim()
        if (cond) settings.displayCondition = cond
        return {
          id, code: extra.code ?? q.title, type: extra.type, text: piping(extra.text ?? tq.question),
          required: q.mandatory === 'Y', randomize: at.random_order === '1', settings,
          choices: extra.choices || [], matrixItems: extra.matrixItems || [],
        }
      }
      const traduireQuestion = (qm, { avecTexte = true } = {}) => {
        if (avecTexte) traduire(`q:${qm.id}:text`, Object.fromEntries(autres.map((lg) => [lg, texteDans(q.qid, lg)])))
        if (qm.settings.description) traduire(`q:${qm.id}:s:description`, Object.fromEntries(autres.map((lg) => [lg, (texteQ(q.qid, lg)?.help || '').replace(/<[^>]*>/g, '').trim()])))
      }
      const choixReponses = (qid, scale = 0) => (reponses.get(qid) || []).filter((r) => r.scale === scale)
      // Réponse-image : chemin seul (thème « image select ») ou balise <img>.
      // Trouvée dans l'archive → choix avec image ; sinon signalée.
      const avecImage = (choix, texteBrut) => {
        const t = String(texteBrut ?? '')
        const src = /^\s*[^\s<>]+\.(png|jpe?g|gif|webp|svg)\s*$/i.test(t) ? t.trim() : (/<img\b/i.test(t) ? attribut(t.match(RE_IMG)[0], 'src') : null)
        if (src == null) return choix
        const url = media(src)
        if (!url) {
          const cle = 'images des réponses (restées sur LimeSurvey)'
          if (!(ignores[cle] ||= []).includes(q.title)) ignores[cle].push(q.title)
          return { ...choix, label: piping(sansImages(t)) }
        }
        const texte = /<img\b/i.test(t) ? sansImages(t) : ''
        return { ...choix, label: piping(texte), mediaUrl: url, mediaType: 'image' }
      }
      const versChoix = (qmId, liste) => liste.map((r) => {
        traduire(`q:${qmId}:c:${r.id}`, r.textes)
        return avecImage({ id: r.id, code: r.code, label: piping(r.textes[langue] ?? ''), anchored: false }, r.textes[langue])
      })
      const sousVersChoix = (qmId, liste) => liste.map((s) => {
        traduire(`q:${qmId}:c:ls-sq${s.qid}`, Object.fromEntries(autres.map((lg) => [lg, texteDans(s.qid, lg)])))
        return avecImage({ id: `ls-sq${s.qid}`, code: s.title, label: piping(texteDans(s.qid) ?? ''), anchored: false }, texteDans(s.qid))
      })
      // Des choix avec image → type « choix avec médias ».
      // (et mémorisés : une réponse-image peut être réaffichée plus loin).
      const typeMedia = (qm, type) => {
        if (!qm.choices.some((c) => c.mediaUrl)) return
        qm.type = type
        choixImages.set(qm.code, { multi: type === 'MEDIA_CHECKBOX', choix: qm.choices.filter((c) => c.mediaUrl).map((c) => ({ code: c.code, url: c.mediaUrl })) })
      }
      const sousVersLignes = (qmId, liste) => liste.map((s) => {
        traduire(`q:${qmId}:m:ls-sq${s.qid}:label`, Object.fromEntries(autres.map((lg) => [lg, texteDans(s.qid, lg)])))
        return { id: `ls-sq${s.qid}`, code: s.title, label: piping(texteDans(s.qid) ?? ''), reversed: false }
      })
      const autre = (qmId, choix) => {
        if (q.other !== 'Y') return choix
        ;(ignores['zone de texte « Autre » (choix « Autre » ajouté)'] ||= []).push(q.title)
        return [...choix, { id: `${qmId}-autre`, code: '-oth-', label: at.other_replace_text || L.autre, anchored: true }]
      }
      const matrice = (id, colonnes, lignes, extra = {}) => {
        const qm = base(id, { type: 'MATRIX', settings: { columns: colonnes.length, columnLabels: colonnes.map((c) => piping(c.texte)) }, ...extra })
        qm.matrixItems = sousVersLignes(id, lignes)
        traduireQuestion(qm, { avecTexte: extra.text == null })
        colonnes.forEach((c, i) => c.textes && traduire(`q:${id}:s:columnLabels:${i}`, c.textes))
        return qm
      }
      const qid = `ls-q${q.qid}`

      switch (q.type) {
        case 'L': case '!': case 'O': {
          const type = q.type === 'L' ? 'RADIO' : q.type === '!' ? 'SELECT' : 'RADIO_COMMENT'
          const qm = base(qid, { type })
          qm.choices = q.type === 'O' ? versChoix(qid, choixReponses(q.qid)) : autre(qid, versChoix(qid, choixReponses(q.qid)))
          if (q.type !== 'O') typeMedia(qm, 'MEDIA_RADIO')
          traduireQuestion(qm)
          bloc.questions.push(qm)
          break
        }
        case 'M': case 'P': {
          const qm = base(qid, { type: q.type === 'M' ? 'CHECKBOX' : 'CHECKBOX_COMMENT' })
          qm.choices = q.type === 'M' ? autre(qid, sousVersChoix(qid, sousQuestions(q.qid))) : sousVersChoix(qid, sousQuestions(q.qid))
          if (q.type === 'M') typeMedia(qm, 'MEDIA_CHECKBOX')
          // Nombre de réponses min / max (attributs LimeSurvey min_answers / max_answers).
          for (const [attr, cle] of [['min_answers', 'minChoices'], ['max_answers', 'maxChoices']]) {
            const n = Number(at[attr])
            if (at[attr] !== undefined && at[attr] !== '' && Number.isInteger(n) && n >= 1) qm.settings[cle] = n
          }
          traduireQuestion(qm)
          bloc.questions.push(qm)
          break
        }
        case 'Y': case 'G': {
          const qm = base(qid, { type: 'RADIO' })
          const paires = q.type === 'Y' ? [['Y', 'oui'], ['N', 'non']] : [['F', 'femme'], ['M', 'homme']]
          qm.choices = paires.map(([code, cle]) => ({ id: `${qid}-${code}`, code, label: L[cle], anchored: false }))
          for (const [code, cle] of paires) traduire(`q:${qid}:c:${qid}-${code}`, Object.fromEntries(autres.map((lg) => [lg, libelles(lg)[cle]])))
          traduireQuestion(qm)
          bloc.questions.push(qm)
          break
        }
        case '5': {
          const qm = base(qid, { type: 'LIKERT', settings: { points: 5 } })
          traduireQuestion(qm)
          bloc.questions.push(qm)
          break
        }
        case 'S': case 'T': case 'U': {
          const settings = q.type === 'S' ? {} : { multiline: true }
          const qm = base(qid, { type: 'TEXT', settings })
          traduireQuestion(qm)
          bloc.questions.push(qm)
          break
        }
        case 'N': {
          const settings = {}
          if (at.min_num_value_n !== undefined && at.min_num_value_n !== '' && Number.isFinite(Number(at.min_num_value_n))) settings.min = Number(at.min_num_value_n)
          if (at.max_num_value_n !== undefined && at.max_num_value_n !== '' && Number.isFinite(Number(at.max_num_value_n))) settings.max = Number(at.max_num_value_n)
          if (at.suffix) settings.unit = at.suffix
          const qm = base(qid, { type: 'NUMERIC', settings })
          traduireQuestion(qm)
          bloc.questions.push(qm)
          break
        }
        case 'K': case 'Q': {
          const sous = sousQuestions(q.qid)
          const total = at.equals_num_value
          if (q.type === 'K' && total && Number.isFinite(Number(total))) {
            const qm = base(qid, { type: 'CONSTANT_SUM', settings: { total: Number(total) } })
            qm.choices = sousVersChoix(qid, sous)
            traduireQuestion(qm)
            bloc.questions.push(qm)
            break
          }
          // Une question par sous-question, code « question_sousquestion ».
          sous.forEach((s, i) => {
            const id = `${qid}-${s.qid}`
            const intitule = `${i === 0 ? `${tq.question} ` : ''}${texteDans(s.qid) ?? ''}`
            const qm = base(id, { type: q.type === 'K' ? 'NUMERIC' : 'TEXT', code: `${q.title}_${s.title}`, text: intitule })
            if (i > 0) delete qm.settings.description
            traduire(`q:${id}:text`, Object.fromEntries(autres.map((lg) => [lg, `${i === 0 ? `${texteDans(q.qid, lg) ?? ''} ` : ''}${texteDans(s.qid, lg) ?? ''}`])))
            bloc.questions.push(qm)
          })
          break
        }
        case 'D': {
          const avecHeure = /H|N/.test(at.date_format || '')
          const qm = base(qid, { type: 'DATE', settings: { format: avecHeure ? 'datetime' : 'date', dateMode: 'free', timeMode: 'free' } })
          traduireQuestion(qm)
          bloc.questions.push(qm)
          break
        }
        case 'R': {
          // Éléments à classer : réponses (LimeSurvey ≤ 5) ou sous-questions (≥ 6).
          const qm = base(qid, { type: 'RANKING' })
          const options = choixReponses(q.qid)
          qm.choices = options.length ? versChoix(qid, options) : sousVersChoix(qid, sousQuestions(q.qid))
          traduireQuestion(qm)
          bloc.questions.push(qm)
          break
        }
        case 'X': {
          // Texte affiché : découpé autour des images, dans l'ordre.
          bloc.questions.push(...texteAffiche(qid, tq.question, (lg) => texteDans(q.qid, lg), { code: q.title, cond }))
          break
        }
        case '|': {
          const max = Number(at.max_num_of_files)
          const qm = base(qid, { type: 'FILE_UPLOAD', settings: { maxFiles: Number.isInteger(max) && max > 0 ? max : 1 } })
          traduireQuestion(qm)
          bloc.questions.push(qm)
          break
        }
        case 'A': case 'B': {
          const n = q.type === 'A' ? 5 : 10
          bloc.questions.push(matrice(qid, Array.from({ length: n }, (_, i) => ({ texte: String(i + 1) })), sousQuestions(q.qid)))
          break
        }
        case 'C': case 'E': {
          const cles = q.type === 'C' ? ['oui', 'incertain', 'non'] : ['plus', 'pareil', 'moins']
          bloc.questions.push(matrice(qid, cles.map((c) => ({ texte: L[c], textes: Object.fromEntries(autres.map((lg) => [lg, libelles(lg)[c]])) })), sousQuestions(q.qid)))
          tableauxRecodes.push(q.title)
          break
        }
        case 'F': case 'H': {
          const colonnes = choixReponses(q.qid).map((r) => ({ texte: r.textes[langue] ?? r.code, textes: r.textes, code: r.code }))
          bloc.questions.push(matrice(qid, colonnes, sousQuestions(q.qid)))
          if (q.type === 'H') (ignores['tableau par colonne (présenté en lignes)'] ||= []).push(q.title)
          tableauxRecodes.push(q.title)
          break
        }
        case '1': {
          // Double échelle : une matrice par échelle, codes « question_1 » et « question_2 ».
          for (const echelle of [0, 1]) {
            const colonnes = choixReponses(q.qid, echelle).map((r) => ({ texte: r.textes[langue] ?? r.code, textes: r.textes }))
            if (!colonnes.length) continue
            const entete = echelle === 0 ? at.dualscale_headerA : at.dualscale_headerB
            const id = `${qid}-e${echelle + 1}`
            const qm = matrice(id, colonnes, sousQuestions(q.qid, 0), { code: `${q.title}_${echelle + 1}`, text: `${tq.question}${entete ? ` — ${entete}` : ''}` })
            qm.matrixItems = qm.matrixItems.map((it) => ({ ...it, id: `${it.id}-e${echelle + 1}` }))
            // Les lignes ont changé d'id : leurs traductions aussi.
            for (const lg of autres) {
              for (const s of sousQuestions(q.qid, 0)) {
                const ancienne = `q:${id}:m:ls-sq${s.qid}:label`
                if (traductions[lg][ancienne] != null) { traductions[lg][`q:${id}:m:ls-sq${s.qid}-e${echelle + 1}:label`] = traductions[lg][ancienne]; delete traductions[lg][ancienne] }
              }
              const t0 = texteDans(q.qid, lg)
              if (t0) traductions[lg][`q:${id}:text`] = piping(t0)
            }
            bloc.questions.push(qm)
          }
          ;(ignores['tableau à double échelle (une matrice par échelle)'] ||= []).push(q.title)
          tableauxRecodes.push(q.title)
          break
        }
      }
    }
    // Groupe sans question reprise (ex. seulement une équation cachée) : pas de
    // bloc vide (il bloquait la passation).
    if (bloc.questions.length) blocs.push(bloc)
  }

  // ── Fin
  if (rl.surveyls_endtext || rl.surveyls_url) {
    const id = 'ls-fin'
    const settings = { title: L.merci, content: piping(rl.surveyls_endtext || '') }
    if (rl.surveyls_url && /^https?:\/\//i.test(rl.surveyls_url) && !/\{/.test(rl.surveyls_url)) settings.redirectUrl = rl.surveyls_url
    blocs.push({ id, type: 'DEBRIEFING', label: 'Fin', settings, questions: [] })
    traduire(`b:${id}:content`, Object.fromEntries(autres.map((lg) => [lg, reglagesLangue.get(lg)?.surveyls_endtext])))
    traduire(`b:${id}:title`, Object.fromEntries(autres.map((lg) => [lg, libelles(lg).merci])))
  }

  // ── Avertissements
  const avertissements = [`Questionnaire converti depuis LimeSurvey : codes des questions, des réponses et des sous-questions conservés. Vérifiez l'étude avant de lancer la collecte.`]
  const liste = (codes) => `${codes.slice(0, 8).join(', ')}${codes.length > 8 ? '…' : ''}`
  for (const [quoi, codes] of Object.entries(ignores)) {
    const ajoute = /ajouté|présenté|une matrice/.test(quoi)
    avertissements.push(`${ajoute ? 'À vérifier' : 'Non repris'} — ${quoi} : ${liste(codes)}.`)
  }
  if (conditionsNonConverties.length) avertissements.push(`Conditions trop complexes, non reprises ou reprises en partie : ${liste([...new Set(conditionsNonConverties)])}. À refaire dans MindCraft (sinon ces questions s'affichent plus souvent que prévu).`)
  if (conditionsGroupeNonConverties.length) avertissements.push(`Conditions de groupe non reprises : ${liste(conditionsGroupeNonConverties)}.`)
  if (tableauxRecodes.length) avertissements.push(`Tableaux (${liste(tableauxRecodes)}) : MindCraft enregistre le numéro de la colonne (1, 2, 3…), et non le code LimeSurvey de la réponse.`)
  if (formules) avertissements.push(`${formules} formule${formules > 1 ? 's' : ''} LimeSurvey ({if(…)}, {sum(…)}…) dans les textes : non calculée${formules > 1 ? 's' : ''} par MindCraft, à remplacer.`)
  if (imagesAbsentes.size) {
    const n = imagesAbsentes.size
    avertissements.push(`${n} image${n > 1 ? 's' : ''} ${fichiers ? `absente${n > 1 ? 's' : ''} de l'archive` : `restée${n > 1 ? 's' : ''} sur LimeSurvey`} (${liste([...imagesAbsentes])}) : non reprise${n > 1 ? 's' : ''}. ${fichiers ? 'Ajoutez-les au .zip, ou' : 'Pour les reprendre, importez un .zip contenant le .lss et les images (export des « ressources » du questionnaire dans LimeSurvey) ; sinon'} ajoutez-les dans MindCraft avec une question « Image ».`)
  }
  if (medias.size) avertissements.push(`${medias.size} image${medias.size > 1 ? 's' : ''} reprise${medias.size > 1 ? 's' : ''} : question${medias.size > 1 ? 's' : ''} « Image » ou choix avec image, à la place qu'elles occupaient.`)
  if (libellesEnCode.size) avertissements.push(`Réponse réaffichée dans un texte ({question.shown}) de ${liste([...libellesEnCode])} : MindCraft affiche le code de la réponse choisie (ex. A1), pas son libellé. À reformuler si besoin.`)
  if (jetonsNonRepris) avertissements.push(`${jetonsNonRepris} insertion${jetonsNonRepris > 1 ? 's' : ''} LimeSurvey ({…}) sans équivalent laissée${jetonsNonRepris > 1 ? 's' : ''} telle${jetonsNonRepris > 1 ? 's' : ''} quelle${jetonsNonRepris > 1 ? 's' : ''} dans les textes.`)

  const metadata = {}
  if (autres.length) metadata.i18n = { defaultLang: langue.slice(0, 2), languages: autres.map((l) => l.slice(0, 2)), translations: Object.fromEntries(Object.entries(traductions).map(([lg, d]) => [lg.slice(0, 2), d])) }

  const dump = {
    mindcraft: {
      export: {
        // Pas de generatedAt : la date d'export LimeSurvey n'est pas connue.
        schemaVersion: '1.1', format: 'mindcraft.study.structure',
        generatedBy: `LimeSurvey (conversion, base ${dbVersion})`,
        notes: 'Structure convertie automatiquement depuis un questionnaire LimeSurvey (.lss).',
      },
      study: { name: titre.replace(/<[^>]*>/g, '').trim() || 'Questionnaire LimeSurvey', description: (rl.surveyls_description || '').replace(/<[^>]*>/g, '').trim().slice(0, 2000) || null, metadata },
      design: null,
      blocks: blocs.map((b) => ({
        ...b,
        questions: b.questions.map((q) => ({ ...q, choices: q.choices || [], matrixItems: q.matrixItems || [] })),
        sequenceSteps: [], stimulusFiles: [],
      })),
    },
  }
  return { dump, avertissements, medias }
}

module.exports = { estLimeSurvey, convertirLimeSurvey, convertirCondition, lireTable }
