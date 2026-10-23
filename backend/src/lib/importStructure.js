// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── IMPORT D'UNE ÉTUDE (format mindcraft.study.structure) ────────────────────
// Fonctions pures (sans DB) : lecture du fichier (.json ou .zip), vérification
// et préparation de toutes les lignes à créer, avec de NOUVEAUX identifiants
// choisis ici. Les références internes (blocs d'un niveau, cibles des
// blocs-logiques, ordre des questions, traductions, médias) sont réécrites
// vers ces identifiants avant toute écriture : la route n'a plus qu'à insérer
// (routes/studies.js, POST /import), dans une seule transaction.
//
// Le fichier vient d'ailleurs : il n'est jamais cru sur parole. Types
// vérifiés, valeurs inconnues ignorées (et signalées), tailles plafonnées.
// Spécification : docs/json-export-format.md.

const crypto = require('crypto')
const path = require('path')
const { BlockType, QuestionType, DesignType, CounterbalanceMethod, QuotaMode } = require('@prisma/client')
const { referencesManquantes } = require('./structure')
const { lireZip } = require('./zip')
const { estLimeSurvey, convertirLimeSurvey } = require('./importLimeSurvey')
const { estQualtrics, convertirQualtrics } = require('./importQualtrics')

const TYPES_BLOCS = Object.keys(BlockType)
const TYPES_QUESTIONS = Object.keys(QuestionType)

// Mêmes types que les envois habituels (routes/stimulus.js, routes/media.js).
const TYPES_STIMULUS = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
  'video/mp4', 'video/webm', 'video/ogg',
]
const TYPES_MEDIAS = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.weba': 'audio/webm',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogv': 'video/ogg',
  '.html': 'text/html', '.htm': 'text/html',
}

const LIMITES = { blocs: 500, questions: 5000, parListe: 1000, fichiers: 5000, texte: 200000, court: 300 }

// Lien vers un média de l'instance (« /api/media/files/<nom> »), éventuellement
// précédé d'une origine (« https://autre-instance/… »).
const RE_MEDIA = /(?:https?:\/\/[^\s"'<>()]*?)?\/api\/media\/files\/([A-Za-z0-9._-]+)/g

// Identifiant de 25 caractères, du même genre que les cuid de Prisma.
function nouvelIdParDefaut() {
  return 'c' + Date.now().toString(36).padStart(9, '0') + crypto.randomBytes(10).toString('hex').slice(0, 15)
}
const nomFichierParDefaut = (ext) => `${crypto.randomBytes(16).toString('hex')}${ext}`

const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const texte = (v, max = LIMITES.texte) => (typeof v === 'string' ? v.slice(0, max) : typeof v === 'number' ? String(v) : null)
const booleen = (v, defaut) => (typeof v === 'boolean' ? v : defaut)
const entier = (v, defaut) => (Number.isInteger(v) ? v : defaut)
const ref = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v) : null)

// Réglages : objet uniquement, sans les commentaires « _… » des fichiers
// modèles (sauf _questionOrder, réglage réel).
function reglages(v) {
  if (!estObjet(v)) return {}
  const r = {}
  for (const [k, val] of Object.entries(v)) if (!k.startsWith('_') || k === '_questionOrder') r[k] = val
  return r
}

// ─── Lecture du fichier ──────────────────────────────────────────────────────
// Renvoie { dump, zip, source, avertissements } : zip (Map nom → Buffer) ou
// null ; source « MindCraft », « LimeSurvey » ou « Qualtrics » ; avertissements de la
// conversion. Lève une Error au message lisible si le fichier est illisible.
// Formats : structure MindCraft (.json, ou .zip avec structure.json) ;
// questionnaire LimeSurvey (.lss, ou archive .lsa / .zip qui en contient un :
// seul le questionnaire est lu, jamais les réponses) ; questionnaire Qualtrics
// (.qsf).
function lireFichierImport(buffer) {
  let zip = null
  let texte
  if (buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50) {
    zip = lireZip(buffer)
    const racine = (ext) => [...zip.keys()].filter((n) => !n.includes('/') && n.toLowerCase().endsWith(ext))
    const nom = zip.has('structure.json') ? 'structure.json' : racine('.json').length === 1 ? racine('.json')[0] : racine('.lss').length === 1 ? racine('.lss')[0] : null
    if (!nom) throw new Error('Archive sans fichier structure.json (ni questionnaire LimeSurvey .lss) à la racine.')
    texte = zip.get(nom).toString('utf8')
    if (nom.toLowerCase().endsWith('.lss')) zip = null // fichiers d'une archive LimeSurvey : non repris
  } else {
    texte = buffer.toString('utf8')
  }
  texte = texte.replace(/^﻿/, '')
  if (estLimeSurvey(texte)) {
    const { dump, avertissements } = convertirLimeSurvey(texte)
    return { dump, zip: null, source: 'LimeSurvey', avertissements }
  }
  if (estQualtrics(texte)) {
    const { dump, avertissements } = convertirQualtrics(texte)
    return { dump, zip: null, source: 'Qualtrics', avertissements }
  }
  try {
    return { dump: JSON.parse(texte), zip, source: 'MindCraft', avertissements: [] }
  } catch {
    throw new Error('Le fichier n\'est ni une structure MindCraft (JSON), ni un questionnaire LimeSurvey (.lss) ou Qualtrics (.qsf).')
  }
}

// Noms des fichiers stimulus et des médias cités par la structure (pour que
// la route cherche ceux déjà présents sur l'instance).
function fichiersReferences(dump) {
  const stimulus = new Set()
  for (const b of Array.isArray(dump?.mindcraft?.blocks) ? dump.mindcraft.blocks : []) {
    for (const f of Array.isArray(b?.stimulusFiles) ? b.stimulusFiles : []) if (typeof f?.filename === 'string') stimulus.add(f.filename)
  }
  const medias = new Set()
  for (const m of JSON.stringify(dump?.mindcraft || {}).matchAll(RE_MEDIA)) medias.add(m[1])
  return { stimulus: [...stimulus], medias: [...medias] }
}

// ─── Préparation ─────────────────────────────────────────────────────────────
// options :
//   zip                 Map des fichiers de l'archive (ou null)
//   stimulusInstance    Set des noms de fichiers stimulus déjà sur l'instance (avec données)
//   mediasInstance      Set des noms de médias déjà sur l'instance
//   baseApi             adresse publique de l'API (« https://… ») : un lien
//                       complet vers un média renommé reste complet
//   nouvelId, nomFichier  générateurs (remplaçables dans les tests)
// Renvoie { erreurs, avertissements, resume, donnees } ; `donnees` est null
// s'il y a des erreurs.
function preparerImport(dump, {
  zip = null, stimulusInstance = new Set(), mediasInstance = new Set(), baseApi = '',
  nouvelId = nouvelIdParDefaut, nomFichier = nomFichierParDefaut,
} = {}) {
  const erreurs = []
  const avertissements = []
  const m0 = dump?.mindcraft
  if (!estObjet(m0)) return { erreurs: ['Ce fichier n\'est pas une structure d\'étude MindCraft (objet « mindcraft » absent).'], avertissements, resume: null, donnees: null }
  if (m0.export?.format != null && m0.export.format !== 'mindcraft.study.structure') erreurs.push(`Format « ${String(m0.export.format).slice(0, 60)} » inconnu.`)
  const version = String(m0.export?.schemaVersion ?? '1.0')
  const [majeure, mineure] = version.split('.').map((x) => parseInt(x, 10))
  if (!(majeure >= 1)) erreurs.push(`Version du format « ${version.slice(0, 20)} » illisible.`)
  else if (majeure > 1) erreurs.push(`Format ${version.slice(0, 20)} trop récent pour cette version de MindCraft.`)
  else if (mineure > 1) avertissements.push(`Fichier au format ${version}, plus récent que celui de cette instance (1.1) : certains réglages peuvent être ignorés.`)
  if (!Array.isArray(m0.blocks)) erreurs.push('Liste des blocs (« blocks ») absente.')
  else if (m0.blocks.length > LIMITES.blocs) erreurs.push(`Trop de blocs (${m0.blocks.length}, maximum ${LIMITES.blocs}).`)
  else if (m0.blocks.reduce((n, b) => n + (Array.isArray(b?.questions) ? b.questions.length : 0), 0) > LIMITES.questions) erreurs.push(`Trop de questions (maximum ${LIMITES.questions}).`)
  if (erreurs.length) return { erreurs, avertissements, resume: null, donnees: null }

  // Références sans cible, signalées avant réécriture (elles seront ignorées).
  const manquantes = referencesManquantes(dump)
  if (manquantes.length) {
    avertissements.push(version === '1.0' && !m0.blocks.some((b) => b?.id != null)
      ? 'Fichier au format 1.0 (sans identifiants) : les blocs liés aux conditions, les sauts de bloc, l\'ordre personnalisé des questions et les traductions ne peuvent pas être repris.'
      : `${manquantes.length} lien${manquantes.length > 1 ? 's' : ''} interne${manquantes.length > 1 ? 's' : ''} (blocs des conditions, sauts de bloc, ordre des questions, traductions) ${manquantes.length > 1 ? 'pointent' : 'pointe'} vers des éléments absents du fichier : ignoré${manquantes.length > 1 ? 's' : ''}.`)
  }

  // Médias : ceux de l'archive reçoivent un nouveau nom, et tous les liens
  // vers eux sont réécrits (dans tous les textes et réglages).
  const medias = []
  const nouveauNomMedia = new Map()
  const compteMedias = { zip: 0, instance: 0, absents: 0 }
  for (const nom of fichiersReferences(dump).medias) {
    const ext = path.extname(nom).toLowerCase()
    if (zip?.has(`medias/${nom}`) && TYPES_MEDIAS[ext]) {
      const nouveau = nomFichier(ext)
      nouveauNomMedia.set(nom, nouveau)
      medias.push({ ancien: nom, filename: nouveau, mimetype: TYPES_MEDIAS[ext], source: 'zip' })
      compteMedias.zip++
    } else if (mediasInstance.has(nom)) compteMedias.instance++
    else compteMedias.absents++
  }
  const m = nouveauNomMedia.size
    ? JSON.parse(JSON.stringify(m0).replace(RE_MEDIA, (tout, nom) => (nouveauNomMedia.has(nom) ? `${/^https?:/.test(tout) ? baseApi : ''}/api/media/files/${nouveauNomMedia.get(nom)}` : tout)))
    : m0
  if (compteMedias.absents) avertissements.push(`${compteMedias.absents} média${compteMedias.absents > 1 ? 's' : ''} (images, sons, vidéos des questions ou des textes) introuvable${compteMedias.absents > 1 ? 's' : ''} : à ajouter de nouveau après l'import.`)

  // ── Étude
  const metadata = reglages(m.study?.metadata)
  const etude = {
    id: nouvelId(),
    name: (texte(m.study?.name, LIMITES.court) || '').trim() || 'Étude importée',
    description: texte(m.study?.description, 5000),
  }

  // ── Blocs et contenu, avec les correspondances ancien → nouvel id
  const idBloc = new Map()
  const idQuestion = new Map()
  const idChoix = new Map()  // « question|choix »
  const idLigne = new Map()  // « question|ligne »
  const idEtape = new Map()  // « bloc|étape »
  const blocs = [], questions = [], choix = [], lignes = [], etapes = [], fichiers = []
  const ignores = { blocs: {}, questions: {} }
  const compteFichiers = { zip: 0, instance: 0, absents: 0, textes: 0, refuses: 0 }
  const codesVus = new Map()
  let doublonsRef = 0

  const noter = (carte, ancien, nouveau) => {
    if (ancien == null) return
    if (carte.has(ancien)) doublonsRef++
    else carte.set(ancien, nouveau)
  }

  for (const b of m.blocks) {
    if (!estObjet(b) || !TYPES_BLOCS.includes(b.type)) {
      const t = String(estObjet(b) ? b.type : typeof b).slice(0, 40)
      ignores.blocs[t] = (ignores.blocs[t] || 0) + 1
      continue
    }
    const bloc = { id: nouvelId(), type: b.type, label: texte(b.label, LIMITES.court), order: blocs.length, settings: reglages(b.settings), studyId: etude.id }
    noter(idBloc, ref(b.id), bloc.id)
    blocs.push({ bloc, source: b })
    let ordreQuestion = 0
    let ordreEtape = 0

    for (const q of (Array.isArray(b.questions) ? b.questions : [])) {
      if (!estObjet(q) || !TYPES_QUESTIONS.includes(q.type)) {
        const t = String(estObjet(q) ? q.type : typeof q).slice(0, 40)
        ignores.questions[t] = (ignores.questions[t] || 0) + 1
        continue
      }
      const qid = nouvelId()
      const code = texte(q.code, 100)
      if (code) codesVus.set(code, (codesVus.get(code) || 0) + 1)
      questions.push({
        id: qid, blockId: bloc.id, code, type: q.type, text: texte(q.text) || '',
        required: booleen(q.required, true), randomize: booleen(q.randomize, false),
        order: ordreQuestion++, settings: reglages(q.settings),
      })
      const qRef = ref(q.id)
      noter(idQuestion, qRef, qid)
      ;(Array.isArray(q.choices) ? q.choices : []).slice(0, LIMITES.parListe).filter(estObjet).forEach((c, i) => {
        const cid = nouvelId()
        choix.push({
          id: cid, questionId: qid, code: texte(c.code, 100) || String(i + 1), label: texte(c.label) || '', order: i,
          anchored: booleen(c.anchored, false), mediaUrl: texte(c.mediaUrl, 2000), mediaType: texte(c.mediaType, 50),
        })
        if (qRef != null && ref(c.id) != null) noter(idChoix, `${qRef}|${ref(c.id)}`, cid)
      })
      ;(Array.isArray(q.matrixItems) ? q.matrixItems : []).slice(0, LIMITES.parListe).filter(estObjet).forEach((it, i) => {
        const lid = nouvelId()
        lignes.push({
          id: lid, questionId: qid, code: texte(it.code, 100) || String(i + 1), label: texte(it.label) || '', order: i,
          reversed: booleen(it.reversed, false), left: texte(it.left, 2000), right: texte(it.right, 2000),
        })
        if (qRef != null && ref(it.id) != null) noter(idLigne, `${qRef}|${ref(it.id)}`, lid)
      })
    }

    const bRef = ref(b.id)
    ;(Array.isArray(b.sequenceSteps) ? b.sequenceSteps : []).slice(0, LIMITES.parListe).filter(estObjet).forEach((s, i) => {
      const type = texte(s.type, 50)
      if (!type) return
      const sid = nouvelId()
      etapes.push({ id: sid, blockId: bloc.id, type, order: ordreEtape++, settings: reglages(s.settings) })
      if (bRef != null && ref(s.id) != null) noter(idEtape, `${bRef}|${ref(s.id)}`, sid)
    })

    for (const f of (Array.isArray(b.stimulusFiles) ? b.stimulusFiles : []).filter(estObjet)) {
      if (fichiers.length >= LIMITES.fichiers) break
      const filename = texte(f.filename, LIMITES.court)
      const mimetype = texte(f.mimetype, 100) || ''
      const ligne = {
        blockId: bloc.id, originalName: texte(f.originalName, LIMITES.court) || filename || '',
        mimetype, category: texte(f.category, LIMITES.court),
      }
      if (mimetype === 'text/plain') {
        fichiers.push({ ...ligne, source: 'texte', filename: filename || 'texte.txt', size: 0, url: '' })
        compteFichiers.textes++
      } else if (!filename || !TYPES_STIMULUS.includes(mimetype)) {
        compteFichiers.refuses++
      } else if (zip?.has(`stimulus/${filename}`)) {
        const nouveau = nomFichier(path.extname(filename).toLowerCase())
        fichiers.push({ ...ligne, source: 'zip', ancien: filename, filename: nouveau, url: `/api/stimulus/files/${nouveau}` })
        compteFichiers.zip++
      } else if (stimulusInstance.has(filename)) {
        // Même instance : on recopie le fichier existant (comme la duplication).
        fichiers.push({ ...ligne, source: 'instance', ancien: filename, filename, url: `/api/stimulus/files/${filename}` })
        compteFichiers.instance++
      } else {
        compteFichiers.absents++
      }
    }
  }

  // ── Réécriture des références vers les nouveaux id
  const verBloc = (v) => (v == null ? v : idBloc.get(String(v)) || null)
  for (const { bloc } of blocs) {
    const s = bloc.settings
    if (Array.isArray(s._questionOrder)) {
      const ici = new Set(questions.filter((q) => q.blockId === bloc.id).map((q) => q.id))
      s._questionOrder = s._questionOrder.map((x) => idQuestion.get(String(x))).filter((x) => x && ici.has(x))
    }
    if (bloc.type === 'LOGIC') {
      if (Array.isArray(s.rules)) s.rules = s.rules.map((r) => (estObjet(r) ? { ...r, targetBlockId: verBloc(r.targetBlockId) } : r))
      if ('defaultTargetBlockId' in s) s.defaultTargetBlockId = verBloc(s.defaultTargetBlockId)
    }
  }

  if (estObjet(metadata.i18n) && estObjet(metadata.i18n.translations)) {
    const traductions = {}
    for (const [langue, dict] of Object.entries(metadata.i18n.translations)) {
      if (!estObjet(dict)) continue
      traductions[langue] = {}
      for (const [cle, val] of Object.entries(dict)) {
        const nouvelle = reecrireCle(cle, { idBloc, idQuestion, idChoix, idLigne, idEtape })
        if (nouvelle) traductions[langue][nouvelle] = val
      }
    }
    metadata.i18n = { ...metadata.i18n, translations: traductions }
  }
  etude.metadata = metadata

  // ── Plan expérimental
  let plan = null
  const idNiveau = new Map() // ancien id de niveau → nouveau (règles « condition »)
  if (estObjet(m.design)) {
    const d = m.design
    const facteursSource = (Array.isArray(d.factors) ? d.factors : []).filter(estObjet)
    let designType = Object.keys(DesignType).includes(d.designType) ? d.designType : null
    if (!designType) {
      designType = facteursSource.length ? 'BETWEEN' : 'NONE'
      if (d.designType != null) avertissements.push(`Type de plan « ${String(d.designType).slice(0, 40)} » inconnu : remplacé par ${designType}.`)
    }
    // « FLEXIBLE » : ancienne valeur des fichiers d'exemple, équivalente à SOFT.
    const quota = d.quotaMode === 'FLEXIBLE' ? 'SOFT' : d.quotaMode
    plan = {
      design: {
        id: nouvelId(), studyId: etude.id, designType,
        counterbalanceMethod: Object.keys(CounterbalanceMethod).includes(d.counterbalanceMethod) ? d.counterbalanceMethod : 'LATIN_SQUARE',
        quotaMode: Object.keys(QuotaMode).includes(quota) ? quota : 'STRICT',
        targetN: entier(d.targetN, 30) > 0 ? Math.min(entier(d.targetN, 30), 1000000) : 30,
        settings: reglages(d.settings),
      },
      facteurs: [],
      niveaux: [],
    }
    let facteursIgnores = 0
    for (const f of facteursSource) {
      if (!['BETWEEN', 'WITHIN'].includes(f.type)) { facteursIgnores++; continue }
      const fid = nouvelId()
      plan.facteurs.push({ id: fid, designId: plan.design.id, name: texte(f.name, LIMITES.court) || `Facteur ${plan.facteurs.length + 1}`, type: f.type, order: plan.facteurs.length })
      ;(Array.isArray(f.levels) ? f.levels : []).slice(0, LIMITES.parListe).filter(estObjet).forEach((l, i) => {
        const code = texte(l.code, 100) || `N${i + 1}`
        const lid = nouvelId()
        if (ref(l.id) != null && !idNiveau.has(ref(l.id))) idNiveau.set(ref(l.id), lid)
        plan.niveaux.push({
          id: lid, factorId: fid, code, name: texte(l.name, LIMITES.court) || code, order: i,
          blockIds: (Array.isArray(l.blockIds) ? l.blockIds : []).map(verBloc).filter(Boolean),
        })
      })
    }
    if (facteursIgnores) avertissements.push(`${facteursIgnores} facteur${facteursIgnores > 1 ? 's' : ''} de type inconnu (ni BETWEEN ni WITHIN) ignoré${facteursIgnores > 1 ? 's' : ''}.`)
  }
  // Règles « condition expérimentale » des blocs-logiques → nouveaux niveaux.
  for (const { bloc } of blocs) {
    if (bloc.type !== 'LOGIC' || !Array.isArray(bloc.settings.rules)) continue
    bloc.settings.rules = bloc.settings.rules.map((r) => (estObjet(r) && r.type === 'CONDITION_ASSIGNMENT' ? { ...r, levelId: idNiveau.get(String(r.levelId)) || null } : r))
  }

  // ── Avertissements sur ce qui n'est pas repris
  const liste = (o) => Object.entries(o).map(([t, n]) => `${t} (${n})`).join(', ')
  if (Object.keys(ignores.blocs).length) avertissements.push(`Blocs de type inconnu ignorés : ${liste(ignores.blocs)}.`)
  if (Object.keys(ignores.questions).length) avertissements.push(`Questions de type inconnu ignorées : ${liste(ignores.questions)}.`)
  if (compteFichiers.absents) avertissements.push(`${compteFichiers.absents} fichier${compteFichiers.absents > 1 ? 's' : ''} de tâche (images, sons, vidéos) absent${compteFichiers.absents > 1 ? 's' : ''} : à ajouter de nouveau dans le bloc après l'import. Importez le .zip (« Structure + fichiers ») pour les reprendre.`)
  if (compteFichiers.refuses) avertissements.push(`${compteFichiers.refuses} fichier${compteFichiers.refuses > 1 ? 's' : ''} de tâche d'un type non autorisé ignoré${compteFichiers.refuses > 1 ? 's' : ''}.`)
  const doublons = [...codesVus].filter(([, n]) => n > 1).map(([c]) => c)
  if (doublons.length) avertissements.push(`Codes de question en double (${doublons.slice(0, 5).join(', ')}${doublons.length > 5 ? '…' : ''}) : à renommer, sinon les colonnes des exports se mélangent.`)
  if (doublonsRef) avertissements.push(`${doublonsRef} identifiant${doublonsRef > 1 ? 's' : ''} en double dans le fichier : seul le premier élément est relié.`)

  const parType = {}
  for (const { bloc } of blocs) parType[bloc.type] = (parType[bloc.type] || 0) + 1
  const resume = {
    nom: etude.name,
    description: etude.description,
    format: version,
    generePar: texte(m.export?.generatedBy, 100),
    genereLe: texte(m.export?.generatedAt, 40),
    blocs: blocs.length,
    parType,
    questions: questions.length,
    facteurs: plan ? plan.facteurs.length : 0,
    niveaux: plan ? plan.niveaux.length : 0,
    langues: Array.isArray(metadata.i18n?.languages) ? metadata.i18n.languages.filter((x) => typeof x === 'string') : [],
    fichiers: compteFichiers,
    medias: compteMedias,
  }

  return {
    erreurs, avertissements, resume,
    donnees: { etude, blocs: blocs.map((x) => x.bloc), questions, choix, lignes, etapes, fichiers, medias, plan },
  }
}

// Clé de traduction (lib/i18nCatalog.js) réécrite vers les nouveaux id ; null
// si elle désigne un bloc ou une question absents (traduction abandonnée).
function reecrireCle(cle, { idBloc, idQuestion, idChoix, idLigne, idEtape }) {
  const p = cle.split(':')
  if (p[0] === 'b') {
    const b = idBloc.get(p[1])
    if (!b) return null
    if (p[2] === 'step' && p[3] != null) {
      const e = idEtape.get(`${p[1]}|${p[3]}`)
      if (e) p[3] = e
      else if (!/^\d+$/.test(p[3])) return null
    }
    p[1] = b
  } else if (p[0] === 'q') {
    const q = idQuestion.get(p[1])
    if (!q) return null
    if ((p[2] === 'c' || p[2] === 'm') && p[3] != null) {
      const n = (p[2] === 'c' ? idChoix : idLigne).get(`${p[1]}|${p[3]}`)
      if (n) p[3] = n // sinon : clé fondée sur le code, gardée telle quelle
    }
    p[1] = q
  }
  return p.join(':')
}

module.exports = { lireFichierImport, fichiersReferences, preparerImport, TYPES_MEDIAS, LIMITES }
