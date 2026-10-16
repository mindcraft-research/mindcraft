// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── ÉCARTS AU PRÉENREGISTREMENT ─────────────────────────────────────────────
// MindCraft compare ce qui a été préenregistré (état de l'étude enregistré au
// verrouillage, voir lib/prereg.js) à ce qui a réellement été fait, et
// propose pour chaque écart une catégorie et un moment. Le chercheur
// confirme ou corrige, puis écrit la raison et l'impact. Les écarts que
// MindCraft ne peut pas voir (analyses, hypothèses) se déclarent à la main.
//
// Tableau final (format habituel des revues) : écart, catégorie, moment,
// raison, impact. Export ODT (ouvert, lisible par Word) et CSV.
//
// Seul ce qui se compare de façon fiable est détecté :
//   - données collectées avant le verrouillage ............. majeur
//   - type de plan, facteur ou condition modifié ............ majeur
//   - mesure ou tâche préenregistrée supprimée .............. majeur
//   - mesure ou tâche ajoutée (à déclarer exploratoire) ..... mineur
//   - effectif (ou objectif) différent de plus de 10 % ...... majeur, sinon mineur
//   - matériel modifié après le verrouillage ................ mineur
//   - amendement ............................................ sa catégorie
//   - écart noté dans le cahier de labo ..................... mineur (à classer)

const { empreinteEtude } = require('./freeze')

const CATEGORIES = {
  MAJEUR: { fr: 'Majeur', en: 'Major', ordre: 0 },
  MINEUR: { fr: 'Mineur', en: 'Minor', ordre: 1 },
  PRECISION: { fr: 'Précision', en: 'Clarification', ordre: 2 },
  SANS_OBJET: { fr: 'Sans objet', en: 'Not applicable', ordre: 3 },
}
// Catégories des amendements (lib/prereg.js) → catégories d'écart.
const DEPUIS_AMENDEMENT = { MAJEUR: 'MAJEUR', MINEUR: 'MINEUR', PRECISION: 'PRECISION' }
const SEUIL_EFFECTIF = 0.10
const LONGUEUR_CHAMP = 5000
const TYPES_SANS_REPONSE = ['DISPLAY', 'IMAGE', 'AUDIO', 'VIDEO', 'META_INFO']

const nomBloc = (b) => b?.settings?.name || b?.label || ''
const mesuresDe = (blocks) => (blocks || []).flatMap((b) => (b.type === 'QUESTION'
  ? (b.questions || []).filter((q) => q.code && !TYPES_SANS_REPONSE.includes(q.type)).map((q) => q.code)
  : []))
const tachesDe = (blocks) => (blocks || []).filter((b) => b.type === 'STIMULUS').map((b) => nomBloc(b) || b.id)
const facteursActuels = (study) => (study?.design?.designType && study.design.designType !== 'NONE' ? study.design.factors || [] : [])
const pourcent = (a, b) => Math.round(((a - b) / b) * 100)
const signe = (n) => (n > 0 ? `+${n}` : String(n).replace('-', '−'))
const tronque = (s, n = 400) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

// ── Textes (langue du préenregistrement) ─────────────────────────────────────
const T = {
  fr: {
    plans: { BETWEEN: 'inter-sujets', WITHIN: 'intra-sujets', MIXED: 'mixte', NONE: 'sans manipulation' },
    donneesAvant: (n) => `${n} participant${n > 1 ? 's avaient' : ' avait'} commencé l’étude avant le verrouillage du préenregistrement.`,
    plan: (a, b) => `Type de plan modifié : ${a} → ${b}.`,
    facteurRetire: (f) => `Facteur retiré : « ${f} ».`,
    facteurAjoute: (f, l) => `Facteur ajouté, non préenregistré : « ${f} » (${l}).`,
    niveauRetire: (f, n) => `Condition retirée : niveau « ${n} » du facteur « ${f} ».`,
    niveauAjoute: (f, n) => `Condition ajoutée, non préenregistrée : niveau « ${n} » du facteur « ${f} ».`,
    mesureSupprimee: (c) => `Mesure préenregistrée supprimée de l’étude : ${c}.`,
    mesureAjoutee: (c) => `Mesure ajoutée, non préenregistrée : ${c} (à déclarer comme exploratoire).`,
    tacheSupprimee: (t) => `Tâche préenregistrée supprimée de l’étude : « ${t} ».`,
    tacheAjoutee: (t) => `Tâche ajoutée, non préenregistrée : « ${t} » (à déclarer comme exploratoire).`,
    effectif: (n, cible, p) => `Effectif final : ${n} participant${n > 1 ? 's' : ''} ayant terminé, pour ${cible} prévus (${signe(p)} %).`,
    objectif: (a, b, p) => `Objectif de participants modifié après le verrouillage : ${a} → ${b} (${signe(p)} %).`,
    materiel: (v1, v2) => `Matériel modifié après le verrouillage (version ${v1} → ${v2}) : consignes, items ou paramètres. Vérifiez si ce changement est déjà couvert par un autre écart.`,
    amendement: (t) => `Amendement : ${t}`,
    cahier: (t) => `Noté dans le cahier de labo : ${t}`,
    moments: {
      AVANT_VERROU: 'Avant le verrouillage du préenregistrement',
      AVANT_COLLECTE: 'Après le verrouillage, avant le premier participant',
      PENDANT: 'Pendant la collecte, avant tout accès aux données',
      APRES_COLLECTE: 'Après la collecte, avant tout accès aux données',
      APRES_ACCES: (d) => `Après un premier accès aux données (premier export le ${d})`,
      FIN_COLLECTE: 'À la fin de la collecte, avant tout accès aux données',
      FIN_COLLECTE_ACCES: (d) => `À la fin de la collecte, après un premier accès aux données (premier export le ${d})`,
      INCONNU: 'Après le verrouillage (date exacte non enregistrée)',
    },
    date: (d) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' }),
  },
  en: {
    plans: { BETWEEN: 'between-subjects', WITHIN: 'within-subjects', MIXED: 'mixed', NONE: 'no manipulation' },
    donneesAvant: (n) => `${n} participant${n > 1 ? 's' : ''} had started the study before the preregistration was locked.`,
    plan: (a, b) => `Design type changed: ${a} → ${b}.`,
    facteurRetire: (f) => `Factor removed: "${f}".`,
    facteurAjoute: (f, l) => `Factor added, not preregistered: "${f}" (${l}).`,
    niveauRetire: (f, n) => `Condition removed: level "${n}" of factor "${f}".`,
    niveauAjoute: (f, n) => `Condition added, not preregistered: level "${n}" of factor "${f}".`,
    mesureSupprimee: (c) => `Preregistered measure removed from the study: ${c}.`,
    mesureAjoutee: (c) => `Measure added, not preregistered: ${c} (to be reported as exploratory).`,
    tacheSupprimee: (t) => `Preregistered task removed from the study: "${t}".`,
    tacheAjoutee: (t) => `Task added, not preregistered: "${t}" (to be reported as exploratory).`,
    effectif: (n, cible, p) => `Final sample: ${n} participant${n > 1 ? 's' : ''} completed the study, ${cible} planned (${signe(p)}%).`,
    objectif: (a, b, p) => `Target sample size changed after locking: ${a} → ${b} (${signe(p)}%).`,
    materiel: (v1, v2) => `Study material changed after locking (version ${v1} → ${v2}): instructions, items or settings. Check whether this change is already covered by another deviation.`,
    amendement: (t) => `Amendment: ${t}`,
    cahier: (t) => `Recorded in the lab notebook: ${t}`,
    moments: {
      AVANT_VERROU: 'Before the preregistration was locked',
      AVANT_COLLECTE: 'After locking, before the first participant',
      PENDANT: 'During data collection, before any access to the data',
      APRES_COLLECTE: 'After data collection, before any access to the data',
      APRES_ACCES: (d) => `After first access to the data (first export on ${d})`,
      FIN_COLLECTE: 'At the end of data collection, before any access to the data',
      FIN_COLLECTE_ACCES: (d) => `At the end of data collection, after first access to the data (first export on ${d})`,
      INCONNU: 'After locking (exact date not recorded)',
    },
    date: (d) => new Date(d).toLocaleDateString('en-GB', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' }),
  },
}
const textes = (langue) => T[langue] || T.fr

// ── Moment proposé ───────────────────────────────────────────────────────────
// ctx.lockedAt, ctx.premiereSession, ctx.collecteEnCours, ctx.premierExport,
// ctx.finCollecte (sortie du statut « En collecte », d'après le cahier de
// labo ; à défaut ctx.derniereActivite, dernière activité d'un participant).
// quand : date de l'écart, ou 'FIN_COLLECTE', ou null.
const finDeCollecte = (ctx) => ctx.finCollecte || ctx.derniereActivite || null

function momentPropose(quand, ctx, langue = 'fr') {
  const t = textes(langue)
  const m = t.moments
  const exportLe = ctx.premierExport ? t.date(ctx.premierExport) : null
  const fin = finDeCollecte(ctx)
  if (quand === 'FIN_COLLECTE') {
    return ctx.premierExport && fin && new Date(ctx.premierExport) < new Date(fin)
      ? m.FIN_COLLECTE_ACCES(exportLe) : m.FIN_COLLECTE
  }
  if (!quand) return m.INCONNU
  const d = new Date(quand)
  if (d < new Date(ctx.lockedAt)) return m.AVANT_VERROU
  if (!ctx.premiereSession || d < new Date(ctx.premiereSession)) return m.AVANT_COLLECTE
  if (ctx.premierExport && d >= new Date(ctx.premierExport)) return m.APRES_ACCES(exportLe)
  if (ctx.collecteEnCours || !fin || d <= new Date(fin)) return m.PENDANT
  return m.APRES_COLLECTE
}

// Première version de l'étude, après le verrouillage, où `condition` est vraie.
function premiereVersion(versions, lockedAt, condition) {
  return (versions || [])
    .filter((v) => new Date(v.createdAt) > new Date(lockedAt))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .find((v) => condition(v.snapshot?.blocks || []))?.createdAt || null
}

// ── Détection ────────────────────────────────────────────────────────────────
// ctx : { prereg (avec structure, lockedAt, amendments), study (complète),
//   lockedAt, premiereSession, derniereActivite, collecteEnCours, termines,
//   premierExport, versions [{ version, createdAt, snapshot }],
//   ecartsCahier [{ id, content, createdAt }], objectifModifieLe }
// Renvoie [{ key, categorie, description, quand }].
function detecterEcarts(ctx, langue = 'fr') {
  const t = textes(langue)
  const st = ctx.prereg?.structure || {}
  const study = ctx.study || {}
  const lockedAt = ctx.lockedAt
  const ecarts = []
  const ajouter = (key, categorie, description, quand) => ecarts.push({ key, categorie, description, quand })

  // Données collectées avant le verrouillage.
  if (st.sessionsAtLock > 0) ajouter('DONNEES_AVANT_VERROU', 'MAJEUR', t.donneesAvant(st.sessionsAtLock), new Date(new Date(lockedAt).getTime() - 1))

  // Plan, facteurs, conditions (comparés par nom de facteur et code de niveau).
  const planAvant = st.designType || 'NONE'
  const planApres = study.design?.designType || 'NONE'
  const designModifieLe = study.design?.updatedAt && new Date(study.design.updatedAt) > new Date(lockedAt) ? study.design.updatedAt : null
  if (planAvant !== planApres) ajouter('PLAN', 'MAJEUR', t.plan(t.plans[planAvant] || planAvant, t.plans[planApres] || planApres), designModifieLe)
  const avant = st.factors || []
  const apres = facteursActuels(study)
  for (const f of avant) {
    const g = apres.find((x) => x.name === f.name)
    if (!g) { ajouter(`FACTEUR_RETIRE:${f.name}`, 'MAJEUR', t.facteurRetire(f.name), null); continue }
    const codesApres = (g.levels || []).map((l) => l.code)
    const codesAvant = (f.levels || []).map((l) => l.code)
    for (const l of f.levels || []) if (!codesApres.includes(l.code)) ajouter(`NIVEAU_RETIRE:${f.name}:${l.code}`, 'MAJEUR', t.niveauRetire(f.name, l.name), null)
    for (const l of g.levels || []) if (!codesAvant.includes(l.code)) ajouter(`NIVEAU_AJOUTE:${f.name}:${l.code}`, 'MAJEUR', t.niveauAjoute(f.name, l.name), null)
  }
  for (const g of apres) {
    if (!avant.some((f) => f.name === g.name)) {
      const ajoutLe = g.createdAt && new Date(g.createdAt) > new Date(lockedAt) ? g.createdAt : null
      ajouter(`FACTEUR_AJOUTE:${g.name}`, 'MAJEUR', t.facteurAjoute(g.name, (g.levels || []).map((l) => l.name).join(', ')), ajoutLe)
    }
  }

  // Mesures et tâches (datées grâce aux versions enregistrées de l'étude).
  const mesuresAvant = st.measures || []
  const mesuresApres = mesuresDe(study.blocks)
  for (const c of mesuresAvant) {
    if (!mesuresApres.includes(c)) ajouter(`MESURE_SUPPRIMEE:${c}`, 'MAJEUR', t.mesureSupprimee(c), premiereVersion(ctx.versions, lockedAt, (b) => !mesuresDe(b).includes(c)))
  }
  for (const c of mesuresApres) {
    if (!mesuresAvant.includes(c)) ajouter(`MESURE_AJOUTEE:${c}`, 'MINEUR', t.mesureAjoutee(c), premiereVersion(ctx.versions, lockedAt, (b) => mesuresDe(b).includes(c)))
  }
  const tachesAvant = st.tasks || []
  const tachesApres = tachesDe(study.blocks)
  for (const n of tachesAvant) {
    if (!tachesApres.includes(n)) ajouter(`TACHE_SUPPRIMEE:${n}`, 'MAJEUR', t.tacheSupprimee(n), premiereVersion(ctx.versions, lockedAt, (b) => !tachesDe(b).includes(n)))
  }
  for (const n of tachesApres) {
    if (!tachesAvant.includes(n)) ajouter(`TACHE_AJOUTEE:${n}`, 'MINEUR', t.tacheAjoutee(n), premiereVersion(ctx.versions, lockedAt, (b) => tachesDe(b).includes(n)))
  }

  // Effectif : écart final une fois la collecte terminée ; pendant la
  // collecte, seulement si l'objectif a été modifié.
  const cible = st.targetN
  if (cible) {
    const categorieEffectif = (n) => (Math.abs(n - cible) / cible > SEUIL_EFFECTIF ? 'MAJEUR' : 'MINEUR')
    if (!ctx.collecteEnCours && ctx.termines > 0 && ctx.termines !== cible) {
      ajouter('EFFECTIF', categorieEffectif(ctx.termines), t.effectif(ctx.termines, cible, pourcent(ctx.termines, cible)), 'FIN_COLLECTE')
    } else if (ctx.collecteEnCours) {
      const actuel = study.design?.targetN
      if (actuel && actuel !== cible) ajouter('OBJECTIF', categorieEffectif(actuel), t.objectif(cible, actuel, pourcent(actuel, cible)), ctx.objectifModifieLe || designModifieLe)
    }
  }

  // Matériel modifié après le verrouillage.
  if (st.materialFingerprint && study.blocks && empreinteEtude(study) !== st.materialFingerprint) {
    ajouter('MATERIEL', 'MINEUR', t.materiel(st.studyVersion ?? '?', study.version ?? '?'), premiereVersion(ctx.versions, lockedAt, () => true))
  }

  // Amendements et écarts notés dans le cahier de labo.
  for (const a of ctx.prereg?.amendments || []) {
    ajouter(`AMENDEMENT:${a.id}`, DEPUIS_AMENDEMENT[a.category] || 'PRECISION', t.amendement(tronque(a.content)), a.createdAt)
  }
  for (const e of ctx.ecartsCahier || []) {
    ajouter(`CAHIER:${e.id}`, 'MINEUR', t.cahier(tronque(e.content)), e.createdAt)
  }

  return ecarts
}

// Tableau final : écarts détectés (avec l'annotation du chercheur s'il y en a)
// puis écarts déclarés à la main ; tri par catégorie, puis par date.
function rapport(detectes, annotations, ctx, langue = 'fr') {
  const parCle = Object.fromEntries((annotations || []).filter((a) => a.key).map((a) => [a.key, a]))
  const lignes = detectes.map((d) => {
    const a = parCle[d.key]
    return {
      id: a?.id || null, key: d.key, detecte: true,
      categorie: a?.category || d.categorie, categorieProposee: d.categorie,
      description: d.description,
      moment: a?.moment ?? momentPropose(d.quand, ctx, langue), momentPropose: momentPropose(d.quand, ctx, langue),
      raison: a?.reason || '', impact: a?.impact || '',
      date: d.quand === 'FIN_COLLECTE' ? finDeCollecte(ctx) : d.quand,
      modifieLe: a?.updatedAt || null, modifiePar: a?.updatedByName || null,
    }
  })
  for (const a of (annotations || []).filter((x) => !x.key)) {
    lignes.push({
      id: a.id, key: null, detecte: false,
      categorie: a.category, categorieProposee: null,
      description: a.description || '', moment: a.moment || '', momentPropose: null,
      raison: a.reason || '', impact: a.impact || '',
      date: a.createdAt, modifieLe: a.updatedAt, modifiePar: a.updatedByName,
    })
  }
  const ordre = (c) => CATEGORIES[c]?.ordre ?? 9
  return lignes.sort((x, y) => ordre(x.categorie) - ordre(y.categorie) || new Date(x.date || 0) - new Date(y.date || 0))
}

const resume = (lignes) => Object.fromEntries(Object.keys(CATEGORIES).map((c) => [c, lignes.filter((l) => l.categorie === c).length]))

// Validation d'une annotation ou d'un écart déclaré. Renvoie { erreur } ou { donnees }.
function validerEcart({ category, moment, reason, impact, description } = {}, { manuel = false } = {}) {
  if (!CATEGORIES[category]) return { erreur: 'Catégorie inconnue.' }
  const champs = { moment, reason, impact, ...(manuel ? { description } : {}) }
  for (const v of Object.values(champs)) {
    if (v !== undefined && v !== null && typeof v !== 'string') return { erreur: 'Valeur invalide.' }
    if (typeof v === 'string' && v.length > LONGUEUR_CHAMP) return { erreur: `${LONGUEUR_CHAMP} caractères au maximum par champ.` }
  }
  if (manuel && !String(description || '').trim()) return { erreur: 'Décrivez l’écart.' }
  if (category === 'SANS_OBJET' && !String(reason || '').trim()) return { erreur: 'Expliquez dans « Raison » pourquoi cet écart est sans objet.' }
  return {
    donnees: {
      category,
      moment: typeof moment === 'string' ? moment.trim() : null,
      reason: String(reason || '').trim(),
      impact: String(impact || '').trim(),
      ...(manuel ? { description: String(description).trim() } : {}),
    },
  }
}

// Appelé à chaque export de données : retient le premier export après le
// verrouillage (sert à dater les écarts). Ne fait jamais échouer l'export.
async function noterPremierExport(prisma, studyId) {
  try {
    await prisma.preregistration.updateMany({
      where: { studyId, status: 'LOCKED', withdrawnAt: null, firstDataExportAt: null },
      data: { firstDataExportAt: new Date() },
    })
  } catch { /* sans effet sur l'export */ }
}

module.exports = {
  CATEGORIES, SEUIL_EFFECTIF, textes, momentPropose, detecterEcarts, rapport, resume, validerEcart,
  noterPremierExport, mesuresDe, tachesDe,
}
