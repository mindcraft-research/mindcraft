// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── PRÉENREGISTREMENT ───────────────────────────────────────────────────────
// Modèle OSF Preregistration, brouillon modifiable, verrouillage (date et
// heure du serveur, empreinte du texte), amendements datés, PDF.
//
// Le verrouillage est définitif : aucune route ne modifie un préenregistrement
// verrouillé. Les ajouts passent par des amendements, eux aussi définitifs.
// Les questions s'affichent en français avec l'intitulé anglais d'origine du
// modèle OSF ; le chercheur rédige dans la langue de son choix et choisit la
// langue des titres du PDF (`language`).

const crypto = require('node:crypto')
const PDFDocument = require('pdfkit')
const { canonique, empreinteEtude } = require('./freeze')
const { textePdf } = require('./pdfTexte')

// ── Modèle OSF Preregistration ───────────────────────────────────────────────
// Structure et intitulés anglais : modèle « OSF Preregistration » du Center
// for Open Science. Libellés et aides en français : rédigés pour MindCraft.
// Types : ligne (texte court), texte (paragraphe), choix (un seul),
// choixMultiples, auteurs (liste nom / affiliation / e-mail).
// Licence du modèle d'origine : CC0 1.0 (domaine public). Source citée par
// bonne pratique ; MindCraft n'est pas affilié au Center for Open Science.
const MODELE_OSF = {
  id: 'OSF',
  nom: 'OSF Preregistration',
  source: {
    fr: 'Adapté du modèle OSF Preregistration (Bowman et al., 2020, Center for Open Science, licence CC0). MindCraft n’est pas affilié au Center for Open Science.',
    en: 'Adapted from the OSF Preregistration template (Bowman et al., 2020, Center for Open Science, CC0 license). MindCraft is not affiliated with the Center for Open Science.',
    reference: 'Bowman, S. D., DeHaven, A. C., Errington, T. M., Hardwicke, T. E., Mellor, D. T., Nosek, B. A., & Soderberg, C. K. (2020). OSF Prereg Template. MetaArXiv. https://doi.org/10.31219/osf.io/epgjd',
  },
  sections: [
    {
      cle: 'study', fr: 'Informations sur l’étude', en: 'Study information',
      questions: [
        { cle: 'title', type: 'ligne', fr: 'Titre', en: 'Title', obligatoire: true },
        { cle: 'authors', type: 'auteurs', fr: 'Auteurs', en: 'Authors', aide: 'Nom et affiliation de chaque auteur ; l’e-mail est facultatif. Les auteurs n’ont pas besoin de compte MindCraft.' },
        { cle: 'description', type: 'texte', fr: 'Description', en: 'Description', aide: 'Contexte et objectif de l’étude, en quelques phrases.' },
        { cle: 'hypotheses', type: 'texte', fr: 'Hypothèses', en: 'Hypotheses', obligatoire: true, aide: 'Chaque hypothèse, numérotée (H1, H2…), avec la direction de l’effet attendu si elle est prévue.' },
      ],
    },
    {
      cle: 'design', fr: 'Plan de l’étude', en: 'Design plan',
      questions: [
        {
          cle: 'studyType', type: 'choix', fr: 'Type d’étude', en: 'Study type',
          options: [
            { valeur: 'experiment', fr: 'Expérience : au moins une variable est manipulée, avec attribution aléatoire aux conditions', en: 'Experiment' },
            { valeur: 'observational', fr: 'Étude observationnelle : aucune manipulation', en: 'Observational study' },
            { valeur: 'metaAnalysis', fr: 'Méta-analyse', en: 'Meta-analysis' },
            { valeur: 'other', fr: 'Autre (à préciser dans « Plan expérimental »)', en: 'Other' },
          ],
        },
        {
          cle: 'blinding', type: 'choixMultiples', fr: 'Aveugle', en: 'Blinding',
          options: [
            { valeur: 'none', fr: 'Pas d’aveugle dans cette étude', en: 'No blinding is involved in this study' },
            { valeur: 'participants', fr: 'Les participants ne savent pas dans quelle condition ils sont', en: 'Participants do not know their assigned condition' },
            { valeur: 'personnel', fr: 'Les personnes en contact avec les participants ne connaissent pas leur condition', en: 'Personnel interacting with participants are not aware of the assigned condition' },
            { valeur: 'analysts', fr: 'Les personnes qui analysent les données ne connaissent pas les conditions', en: 'Personnel analyzing the data are not aware of the conditions' },
          ],
        },
        { cle: 'blindingOther', type: 'texte', fr: 'Autre précision sur l’aveugle', en: 'Additional blinding', aide: 'Facultatif.' },
        { cle: 'studyDesign', type: 'texte', fr: 'Plan expérimental', en: 'Study design', aide: 'Facteurs, niveaux, inter- ou intra-sujets, nombre de conditions.' },
        { cle: 'randomization', type: 'texte', fr: 'Randomisation', en: 'Randomization', aide: 'Comment les participants sont attribués aux conditions, et comment l’ordre de présentation est déterminé.' },
      ],
    },
    {
      cle: 'sampling', fr: 'Échantillonnage', en: 'Sampling plan',
      questions: [
        {
          cle: 'existingData', type: 'choix', fr: 'Données existantes', en: 'Existing data',
          options: [
            { valeur: 'beforeCreation', fr: 'Préenregistrement avant toute collecte de données', en: 'Registration prior to creation of data' },
            { valeur: 'beforeObservation', fr: 'Données déjà collectées, mais personne ne les a encore regardées', en: 'Registration prior to any human observation of the data' },
            { valeur: 'beforeAccess', fr: 'Données déjà collectées et regardées, mais pas par les auteurs de ce préenregistrement', en: 'Registration prior to accessing the data' },
            { valeur: 'beforeAnalysis', fr: 'Données déjà consultées, mais pas encore analysées', en: 'Registration prior to analysis of the data' },
          ],
        },
        { cle: 'existingDataExplanation', type: 'texte', fr: 'Précisions sur les données existantes', en: 'Explanation of existing data', aide: 'Facultatif. Si des données existent déjà : ce qui a été vu, par qui, et pourquoi cela ne biaise pas les analyses.' },
        { cle: 'dataCollection', type: 'texte', fr: 'Procédure de collecte', en: 'Data collection procedures', aide: 'Population visée, recrutement, critères d’inclusion, rémunération éventuelle, déroulé de la passation.' },
        { cle: 'sampleSize', type: 'texte', fr: 'Taille d’échantillon', en: 'Sample size' },
        { cle: 'sampleSizeRationale', type: 'texte', fr: 'Justification de la taille d’échantillon', en: 'Sample size rationale', aide: 'Analyse de puissance (taille d’effet attendue et sa source, alpha, puissance visée), ou autre justification.' },
        { cle: 'stoppingRule', type: 'texte', fr: 'Règle d’arrêt', en: 'Stopping rule', aide: 'Quand et comment la collecte s’arrête.' },
      ],
    },
    {
      cle: 'variables', fr: 'Variables', en: 'Variables',
      questions: [
        { cle: 'manipulatedVariables', type: 'texte', fr: 'Variables manipulées', en: 'Manipulated variables' },
        { cle: 'measuredVariables', type: 'texte', fr: 'Variables mesurées', en: 'Measured variables', aide: 'Chaque mesure, avec son code dans MindCraft : c’est ce qui permettra de repérer les écarts.' },
        { cle: 'indices', type: 'texte', fr: 'Indices calculés', en: 'Indices', aide: 'Scores composites (moyenne d’items, items inversés…) et leur calcul.' },
      ],
    },
    {
      cle: 'analysis', fr: 'Plan d’analyse', en: 'Analysis plan',
      questions: [
        { cle: 'statisticalModels', type: 'texte', fr: 'Modèles statistiques', en: 'Statistical models', aide: 'Le test prévu pour chaque hypothèse (ex. H1 : ANOVA à un facteur sur le score X).' },
        { cle: 'transformations', type: 'texte', fr: 'Transformations', en: 'Transformations', aide: 'Recodages, centrage, transformations logarithmiques…' },
        { cle: 'inferenceCriteria', type: 'texte', fr: 'Critères d’inférence', en: 'Inference criteria', aide: 'Seuil de significativité, correction pour comparaisons multiples, tests uni- ou bilatéraux, facteurs de Bayes…' },
        { cle: 'dataExclusion', type: 'texte', fr: 'Exclusion de données', en: 'Data exclusion', aide: 'Participants ou essais exclus : questions de vigilance, temps de passation, valeurs aberrantes…' },
        { cle: 'missingData', type: 'texte', fr: 'Données manquantes', en: 'Missing data' },
        { cle: 'exploratoryAnalysis', type: 'texte', fr: 'Analyses exploratoires', en: 'Exploratory analysis', aide: 'Facultatif. Analyses prévues mais sans hypothèse.' },
      ],
    },
    {
      cle: 'other', fr: 'Autre', en: 'Other',
      questions: [
        { cle: 'other', type: 'texte', fr: 'Autres informations', en: 'Other', aide: 'Facultatif.' },
      ],
    },
  ],
}

const MODELES = { OSF: MODELE_OSF }
const LANGUES = ['fr', 'en']
const CATEGORIES_AMENDEMENT = {
  PRECISION: { fr: 'Précision', en: 'Clarification' },
  MINEUR: { fr: 'Écart mineur', en: 'Minor deviation' },
  MAJEUR: { fr: 'Écart majeur', en: 'Major deviation' },
}
const LONGUEUR_LIGNE = 300
const LONGUEUR_TEXTE = 20000
const LONGUEUR_AMENDEMENT = 5000
const MAX_AUTEURS = 30
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const questionsDe = (modele) => modele.sections.flatMap((s) => s.questions)

// ── Validation d'un brouillon ────────────────────────────────────────────────
// Ne garde que les questions du modèle et des valeurs du bon type. Renvoie
// { erreur } ou { donnees: { language, answers, authors } }.
function validerBrouillon({ language, answers, authors } = {}, modele = MODELE_OSF) {
  const propre = {}
  const brut = answers && typeof answers === 'object' ? answers : {}
  for (const q of questionsDe(modele)) {
    if (q.type === 'auteurs' || brut[q.cle] === undefined || brut[q.cle] === null) continue
    const v = brut[q.cle]
    if (q.type === 'ligne' || q.type === 'texte') {
      if (typeof v !== 'string') return { erreur: `Réponse invalide : ${q.fr}.` }
      const max = q.type === 'ligne' ? LONGUEUR_LIGNE : LONGUEUR_TEXTE
      if (v.length > max) return { erreur: `« ${q.fr} » : ${max} caractères au maximum.` }
      propre[q.cle] = v
    } else if (q.type === 'choix') {
      if (v === '') continue
      if (!q.options.some((o) => o.valeur === v)) return { erreur: `Réponse invalide : ${q.fr}.` }
      propre[q.cle] = v
    } else if (q.type === 'choixMultiples') {
      if (!Array.isArray(v) || v.some((x) => !q.options.some((o) => o.valeur === x))) return { erreur: `Réponse invalide : ${q.fr}.` }
      propre[q.cle] = [...new Set(v)]
    }
  }

  const listeAuteurs = Array.isArray(authors) ? authors : []
  if (listeAuteurs.length > MAX_AUTEURS) return { erreur: `${MAX_AUTEURS} auteurs au maximum.` }
  const auteurs = []
  for (const a of listeAuteurs) {
    const name = String(a?.name ?? '').trim().slice(0, 200)
    const affiliation = String(a?.affiliation ?? '').trim().slice(0, 300)
    const email = String(a?.email ?? '').trim().slice(0, 200)
    if (email && !EMAIL.test(email)) return { erreur: `Adresse e-mail invalide : ${email}` }
    // Une ligne entièrement vide est ignorée ; une ligne commencée est gardée
    // telle quelle (le brouillon s'enregistre en cours de saisie).
    if (!name && !affiliation && !email) continue
    auteurs.push({ name, affiliation, email })
  }

  return { donnees: { language: LANGUES.includes(language) ? language : 'fr', answers: propre, authors: auteurs } }
}

// Points à compléter avant de verrouiller : obligatoires bloquants, autres
// réponses vides signalées.
function manquants(prereg, modele = MODELE_OSF) {
  const answers = prereg?.answers || {}
  const vide = (q) => {
    if (q.type === 'auteurs') return !(prereg?.authors || []).some((a) => a.name)
    const v = answers[q.cle]
    return Array.isArray(v) ? v.length === 0 : !String(v ?? '').trim()
  }
  const qs = questionsDe(modele)
  return {
    obligatoires: qs.filter((q) => q.obligatoire && vide(q)).map((q) => q.fr),
    vides: qs.filter((q) => !q.obligatoire && vide(q) && !/^Facultatif/.test(q.aide || '')).map((q) => q.fr),
  }
}

// ── Pré-remplissage depuis la conception ─────────────────────────────────────
const sansHtml = (s) => String(s ?? '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ').trim()
const tronque = (s, n = 140) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const nomBloc = (b) => b?.settings?.name || b?.label || ''
// Types sans réponse du participant : pas des mesures.
const TYPES_SANS_REPONSE = ['DISPLAY', 'IMAGE', 'AUDIO', 'VIDEO', 'META_INFO']

const T = {
  fr: {
    sansManip: 'Étude sans manipulation expérimentale : tous les participants voient le même matériel.',
    plan: { BETWEEN: 'Plan inter-sujets', WITHIN: 'Plan intra-sujets', MIXED: 'Plan mixte' },
    conditions: (n) => `${n} condition${n > 1 ? 's' : ''}`,
    typeFacteur: { BETWEEN: 'inter-sujets', WITHIN: 'intra-sujets' },
    attribution: 'Attribution aléatoire et équilibrée des participants aux conditions inter-sujets, réalisée automatiquement par MindCraft.',
    contrebalancement: { LATIN_SQUARE: 'carré latin', WILLIAMS: 'plan de Williams (carré latin équilibré pour les effets de report)', RANDOM: 'ordre aléatoire pour chaque participant' },
    ordreIntra: (m) => `Ordre de présentation des conditions intra-sujets contrebalancé : ${m}.`,
    groupes: (g) => `Ordre tiré au hasard pour chaque participant entre les blocs ${g}.`,
    collecte: 'Passation en ligne sur MindCraft, via un lien de participation. Population visée, recrutement et critères d’inclusion : à compléter.',
    effectif: (n) => `${n} participants.`,
    arret: (n) => `La collecte s’arrête automatiquement quand ${n} participants ont commencé l’étude (objectif fixé dans MindCraft).`,
    abandon: (h) => ` Une passation sans activité depuis ${h} h est considérée comme abandonnée et libère sa place.`,
    tache: (n) => `Tâche « ${n} » : réponse et temps de réaction à chaque essai.`,
    tacheSansNom: 'Tâche : réponse et temps de réaction à chaque essai.',
  },
  en: {
    sansManip: 'No experimental manipulation: all participants see the same material.',
    plan: { BETWEEN: 'Between-subjects design', WITHIN: 'Within-subjects design', MIXED: 'Mixed design' },
    conditions: (n) => `${n} condition${n > 1 ? 's' : ''}`,
    typeFacteur: { BETWEEN: 'between-subjects', WITHIN: 'within-subjects' },
    attribution: 'Participants are randomly assigned to the between-subjects conditions, with balanced group sizes, automatically by MindCraft.',
    contrebalancement: { LATIN_SQUARE: 'Latin square', WILLIAMS: 'Williams design (Latin square balanced for carry-over effects)', RANDOM: 'random order for each participant' },
    ordreIntra: (m) => `The order of within-subjects conditions is counterbalanced: ${m}.`,
    groupes: (g) => `The order of blocks ${g} is randomized for each participant.`,
    collecte: 'Online data collection on MindCraft, through a participation link. Target population, recruitment and inclusion criteria: to be completed.',
    effectif: (n) => `${n} participants.`,
    arret: (n) => `Data collection stops automatically once ${n} participants have started the study (target set in MindCraft).`,
    abandon: (h) => ` A session with no activity for ${h} h is considered abandoned and frees its slot.`,
    tache: (n) => `Task "${n}": response and reaction time on each trial.`,
    tacheSansNom: 'Task: response and reaction time on each trial.',
  },
}

const facteursDe = (study) => (study?.design?.designType && study.design.designType !== 'NONE' ? study.design.factors || [] : [])

// Textes proposés pour les questions que MindCraft peut déduire de l'étude.
// Uniquement des suggestions : le chercheur les insère s'il le souhaite.
function suggestions(study, { nbSessions = 0, langue = 'fr' } = {}) {
  const t = T[langue] || T.fr
  const s = {}
  const design = study?.design
  const facteurs = facteursDe(study)

  if (study?.name) s.title = study.name
  if (facteurs.length) s.studyType = 'experiment'
  if (nbSessions === 0) s.existingData = 'beforeCreation'

  if (!facteurs.length) {
    s.studyDesign = t.sansManip
  } else {
    const dims = facteurs.map((f) => (f.levels || []).length || 1)
    const n = dims.reduce((a, b) => a * b, 1)
    s.studyDesign = [
      `${t.plan[design.designType] || t.plan.BETWEEN} ${dims.join(' × ')} (${t.conditions(n)}).`,
      ...facteurs.map((f) => `- ${f.name} (${t.typeFacteur[f.type] || f.type}) : ${(f.levels || []).map((l) => l.name).join(', ')}`),
    ].join('\n')
    s.manipulatedVariables = facteurs
      .map((f) => `- ${f.name} : ${(f.levels || []).map((l) => (l.code && l.code !== l.name ? `${l.name} (${l.code})` : l.name)).join(', ')}`)
      .join('\n')
  }

  const rando = []
  if (facteurs.some((f) => f.type === 'BETWEEN')) rando.push(t.attribution)
  if (facteurs.some((f) => f.type === 'WITHIN')) rando.push(t.ordreIntra(t.contrebalancement[design.counterbalanceMethod] || design.counterbalanceMethod))
  const groupes = {}
  for (const b of study?.blocks || []) {
    const g = b?.settings?.randomGroup
    if (g) (groupes[g] = groupes[g] || []).push(nomBloc(b) || b.type)
  }
  for (const noms of Object.values(groupes)) if (noms.length > 1) rando.push(t.groupes(noms.map((x) => `« ${x} »`).join(', ')))
  if (rando.length) s.randomization = rando.join('\n')

  s.dataCollection = t.collecte
  if (design?.targetN) {
    s.sampleSize = t.effectif(design.targetN)
    const h = design?.settings?.abandonAfterHours
    s.stoppingRule = t.arret(design.targetN) + (h ? t.abandon(h) : '')
  }

  const mesures = []
  for (const b of study?.blocks || []) {
    if (b.type === 'QUESTION') {
      for (const q of b.questions || []) {
        if (TYPES_SANS_REPONSE.includes(q.type) || !q.code) continue
        const texte = tronque(sansHtml(q.text))
        mesures.push(texte ? `- ${q.code} : ${texte}` : `- ${q.code}`)
      }
    } else if (b.type === 'STIMULUS') {
      mesures.push(`- ${nomBloc(b) ? t.tache(nomBloc(b)) : t.tacheSansNom}`)
    }
  }
  if (mesures.length) s.measuredVariables = mesures.join('\n')

  return s
}

// État de l'étude au verrouillage : servira à repérer les écarts entre le
// préenregistrement et ce qui a réellement été fait.
function structureEtude(study, { nbSessions = 0 } = {}) {
  return {
    studyVersion: study?.version ?? null,
    targetN: study?.design?.targetN ?? null,
    designType: study?.design?.designType ?? 'NONE',
    factors: facteursDe(study).map((f) => ({ name: f.name, type: f.type, levels: (f.levels || []).map((l) => ({ name: l.name, code: l.code })) })),
    measures: (study?.blocks || []).flatMap((b) => (b.type === 'QUESTION' ? (b.questions || []).filter((q) => q.code && !TYPES_SANS_REPONSE.includes(q.type)).map((q) => q.code) : [])),
    tasks: (study?.blocks || []).filter((b) => b.type === 'STIMULUS').map((b) => nomBloc(b) || b.id),
    sessionsAtLock: nbSessions,
    materialFingerprint: study ? empreinteEtude(study) : null,
  }
}

// Empreinte du texte verrouillé : toute modification du contenu la change.
function empreintePrereg({ template, language, answers, authors, lockedAt }) {
  const contenu = canonique({ template, language, answers: answers || {}, authors: authors || [], lockedAt: new Date(lockedAt).toISOString() })
  return crypto.createHash('sha256').update(contenu).digest('hex')
}

const nouveauJeton = () => crypto.randomBytes(18).toString('base64url')

// Version pour relecture anonyme : sans auteurs ni noms.
function versionAnonyme(prereg) {
  return {
    ...prereg,
    authors: [],
    lockedByName: null,
    amendments: (prereg.amendments || []).map((a) => ({ ...a, authorName: null })),
  }
}

// ── PDF ──────────────────────────────────────────────────────────────────────
const LIB_PDF = {
  fr: {
    titre: 'Préenregistrement', sansTitre: 'Sans titre', modele: 'Modèle', empreinte: 'Empreinte du texte (SHA-256)',
    verrouille: (d) => `Verrouillé sur MindCraft le ${d} (heure de Paris). Ce texte ne peut plus être modifié.`,
    brouillon: 'BROUILLON : non verrouillé, ce texte peut encore être modifié.',
    verifier: 'Vérifier en ligne', auteurs: 'Auteurs', auteursMasques: 'Auteurs masqués (version pour relecture anonyme).',
    aucunAuteur: 'Aucun auteur indiqué.', pasDeReponse: '(pas de réponse)', amendements: 'Amendements',
    amendementsIntro: 'Ajoutés après le verrouillage. Ils complètent le texte ci-dessus sans le modifier.', page: 'page',
  },
  en: {
    titre: 'Preregistration', sansTitre: 'Untitled', modele: 'Template', empreinte: 'Text fingerprint (SHA-256)',
    verrouille: (d) => `Locked on MindCraft on ${d} (Paris time). This text can no longer be changed.`,
    brouillon: 'DRAFT: not locked, this text may still change.',
    verifier: 'Verify online', auteurs: 'Authors', auteursMasques: 'Authors hidden (anonymized version for peer review).',
    aucunAuteur: 'No author listed.', pasDeReponse: '(no response)', amendements: 'Amendments',
    amendementsIntro: 'Added after locking. They complement the text above without changing it.', page: 'page',
  },
}

const dateHeure = (d, langue) => (langue === 'en'
  ? new Date(d).toLocaleString('en-GB', { timeZone: 'Europe/Paris', dateStyle: 'long', timeStyle: 'short' })
  : new Date(d).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'long', timeStyle: 'short' }))

// Réponse lisible d'une question (choix → libellé de l'option).
function reponseLisible(q, v, langue) {
  if (q.type === 'choix') return q.options.find((o) => o.valeur === v)?.[langue] || ''
  if (q.type === 'choixMultiples') return (Array.isArray(v) ? v : []).map((x) => `- ${q.options.find((o) => o.valeur === x)?.[langue] || x}`).join('\n')
  return String(v ?? '').trim()
}

// prereg : objet Preregistration (avec amendments). anonyme : sans auteurs.
// urlVerification : lien de consultation imprimé dans le PDF.
function genererPdfPrereg(prereg, { anonyme = false, urlVerification = null } = {}) {
  const modele = MODELES[prereg.template] || MODELE_OSF
  const langue = LANGUES.includes(prereg.language) ? prereg.language : 'fr'
  const L = LIB_PDF[langue]
  const p = anonyme ? versionAnonyme(prereg) : prereg
  const answers = p.answers || {}
  const titre = String(answers.title || '').trim() || L.sansTitre
  const verrouille = p.status === 'LOCKED'

  const doc = new PDFDocument({ margin: 56, size: 'A4', bufferPages: true, info: { Title: `${L.titre} – ${titre}`, Author: 'MindCraft' } })
  const morceaux = []
  doc.on('data', (c) => morceaux.push(c))
  const fini = new Promise((ok) => doc.on('end', ok))

  const NAVY = '#1e3a5f', GRIS = '#6b7280', TEXTE = '#111827', ROUGE = '#b91c1c', VERT = '#0f766e'
  doc.font('Helvetica').fontSize(10).fillColor(GRIS).text(`MindCraft · ${L.titre}`)
  doc.moveDown(0.3).font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text(textePdf(titre))
  doc.moveDown(0.4).font('Helvetica-Bold').fontSize(10)
  if (verrouille) doc.fillColor(VERT).text(L.verrouille(dateHeure(p.lockedAt, langue)))
  else doc.fillColor(ROUGE).text(L.brouillon)
  doc.font('Helvetica').fontSize(9).fillColor(GRIS).moveDown(0.2).text(textePdf(modele.source?.[langue] || `${L.modele} : ${modele.nom}`))
  if (verrouille && p.fingerprint) doc.text(`${L.empreinte} : ${p.fingerprint}`)
  if (urlVerification) doc.text(`${L.verifier} : ${urlVerification}`, { link: urlVerification, underline: false })
  doc.moveDown(1)

  const titreSection = (txt) => {
    if (doc.y > doc.page.height - 140) doc.addPage()
    doc.moveDown(0.4).font('Helvetica-Bold').fontSize(13).fillColor(NAVY).text(textePdf(txt))
    doc.moveTo(doc.page.margins.left, doc.y + 2).lineTo(doc.page.width - doc.page.margins.right, doc.y + 2).lineWidth(0.5).strokeColor('#d1d5db').stroke()
    doc.moveDown(0.5)
  }
  const bloc = (libelle, texte) => {
    if (doc.y > doc.page.height - 110) doc.addPage()
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(TEXTE).text(textePdf(libelle))
    doc.moveDown(0.15)
    if (texte) doc.font('Helvetica').fontSize(10.5).fillColor(TEXTE).text(textePdf(texte), { lineGap: 1.5 })
    else doc.font('Helvetica-Oblique').fontSize(10).fillColor(GRIS).text(L.pasDeReponse)
    doc.moveDown(0.7)
  }

  for (const section of modele.sections) {
    titreSection(section[langue])
    for (const q of section.questions) {
      if (q.cle === 'title') continue // déjà en titre du document
      if (q.type === 'auteurs') {
        if (anonyme) { bloc(q[langue], L.auteursMasques); continue }
        const auteurs = p.authors || []
        bloc(q[langue], auteurs.length ? auteurs.map((a) => [a.name, a.affiliation].filter(Boolean).join(', ')).join('\n') : L.aucunAuteur)
        continue
      }
      bloc(q[langue], reponseLisible(q, answers[q.cle], langue))
    }
  }

  const amendements = p.amendments || []
  if (amendements.length) {
    titreSection(L.amendements)
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(GRIS).text(L.amendementsIntro)
    doc.moveDown(0.6)
    for (const a of amendements) {
      const cat = CATEGORIES_AMENDEMENT[a.category]?.[langue] || a.category
      bloc(`${dateHeure(a.createdAt, langue)} · ${cat}${a.authorName ? ` · ${a.authorName}` : ''}`, a.content)
    }
  }

  const pages = doc.bufferedPageRange()
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(pages.start + i)
    doc.font('Helvetica').fontSize(8).fillColor(GRIS)
      .text(textePdf(`MindCraft · ${L.titre} · ${L.page} ${i + 1} / ${pages.count}`), 56, doc.page.height - 40, { align: 'center', lineBreak: false })
  }
  doc.end()
  return fini.then(() => Buffer.concat(morceaux))
}

module.exports = {
  MODELE_OSF, MODELES, LANGUES, CATEGORIES_AMENDEMENT, LONGUEUR_AMENDEMENT,
  validerBrouillon, manquants, suggestions, structureEtude, empreintePrereg, nouveauJeton, versionAnonyme,
  genererPdfPrereg, sansHtml,
}
