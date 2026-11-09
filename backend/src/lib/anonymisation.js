// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── ANONYMISATION DES RÉPONSES LIBRES ───────────────────────────────────────
// Avant l'export, le chercheur relit les réponses libres et masque les
// passages qui pourraient identifier quelqu'un (« Paul Durand » → « [NOM] »).
// MindCraft propose des passages suspects (e-mail, téléphone, nom propre…),
// le chercheur décide. Les masques (table Masquage) sont appliqués aux réponses
// aux questions de TOUS les exports (pas aux résultats de tâches externes ni aux
// essais) ; la réponse d'origine reste en base, inchangée.
//
// Formes des réponses libres (voir components/runner/questions) :
//   TEXT, INPUT_DEMAND      → "texte"
//   WORD_LIST               → ["mot", …]
//   FILL_BLANK              → { "0": "texte", "1": "texte" }
//   RADIO_COMMENT           → { choice: "A", comment: "texte" }
//   CHECKBOX_COMMENT        → { choices: ["A"], comment: "texte" }
// Les codes de modalités (choice, choices) ne sont jamais masqués.

const TYPES_LIBRES = ['TEXT', 'INPUT_DEMAND', 'FILL_BLANK', 'WORD_LIST', 'RADIO_COMMENT', 'CHECKBOX_COMMENT']
const CLES_CODES = new Set(['choice', 'choices'])

const ETIQUETTES = ['[NOM]', '[LIEU]', '[ORGANISATION]', '[EMAIL]', '[TÉLÉPHONE]', '[DATE]', '[NUMÉRO]', '[URL]', '[MASQUÉ]']
const LONGUEUR_MAX_PASSAGE = 200

// ── Lecture / réécriture des textes d'une réponse ───────────────────────────

const MOT = '[\\p{L}\\p{N}]+'
const LETTRE = '[\\p{L}\\p{N}]'
const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Le passage figure-t-il dans le texte comme mot entier (pas collé à une
// lettre ou un chiffre) ? Un trait d'union compte comme séparateur.
const entierDans = (texte, passage) => new RegExp(`(?<!${LETTRE})${echapper(passage)}(?!${LETTRE})`, 'u').test(texte)

// Motif d'un masque dans un texte : ses occurrences en mots entiers seulement
// (« Marie » ne touche pas « Mariette ») ; s'il n'y figure qu'à l'intérieur
// d'un mot, c'est que ce morceau a été choisi tel quel : il est masqué partout
// où il apparaît, comme avant (un masque déjà posé ne cesse jamais de masquer).
function motifMasque(texte, passage) {
  const e = echapper(passage)
  return entierDans(texte, passage) ? `(?<!${LETTRE})${e}(?!${LETTRE})` : e
}

// Textes saisis par le participant dans une réponse (hors codes de modalités).
function textesDe(value) {
  if (typeof value === 'string') return value.trim() ? [value] : []
  if (Array.isArray(value)) return value.flatMap(textesDe)
  if (value && typeof value === 'object') {
    return Object.entries(value).filter(([k]) => !CLES_CODES.has(k)).flatMap(([, v]) => textesDe(v))
  }
  return []
}

// Remplace chaque passage masqué par son étiquette, dans tous les textes de
// la réponse, en une seule passe (une étiquette n'est jamais retouchée). Mots
// entiers seulement (voir motifMasque) : avec le masque « Marie », « Mariette »
// reste lisible. Un mot composé est masqué en entier : « Marie-Claire » donne
// « [NOM] » et non « [NOM]-Claire ». Respecte la casse : « Masquer partout »
// enregistre chaque écriture trouvée (voir variantesDe). Les plus longs d'abord
// (« Paul Durand » avant « Paul »). Renvoie une nouvelle valeur, la valeur
// d'origine n'est pas modifiée.
function appliquerMasques(value, masques) {
  if (!masques || !masques.length) return value
  const tries = [...masques].filter((m) => m && m.texte).sort((a, b) => b.texte.length - a.texte.length)
  if (!tries.length) return value
  const remplacer = (s) => {
    const re = new RegExp(`(?:${MOT}-)*(?:${tries.map((m) => `(${motifMasque(s, m.texte)})`).join('|')})(?:-${MOT})*`, 'gu')
    return s.replace(re, (...args) => tries[args.slice(1, tries.length + 1).findIndex((g) => g !== undefined)].etiquette)
  }
  const parcourir = (v) => {
    if (typeof v === 'string') return remplacer(v)
    if (Array.isArray(v)) return v.map(parcourir)
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, CLES_CODES.has(k) ? x : parcourir(x)]))
    }
    return v
  }
  return parcourir(value)
}

// Applique les masques à une liste de QuestionResponse (exports).
// `masquages` : lignes Masquage { responseId, texte, etiquette }.
function masquerReponses(responses, masquages) {
  if (!masquages || !masquages.length) return responses
  const parReponse = new Map()
  for (const m of masquages) {
    if (!parReponse.has(m.responseId)) parReponse.set(m.responseId, [])
    parReponse.get(m.responseId).push(m)
  }
  return responses.map((r) => (parReponse.has(r.id) ? { ...r, value: appliquerMasques(r.value, parReponse.get(r.id)) } : r))
}

// ── Détection des passages suspects ─────────────────────────────────────────
// Simple et transparente : des expressions régulières, pas d'IA. Elle propose,
// elle ne masque rien d'elle-même. Les noms propres sont repérés par la
// majuscule : beaucoup de faux positifs possibles (« Paris » est peut-être
// utile à l'analyse), d'où la relecture.

const MOIS = 'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre'
const DETECTEURS = [
  { categorie: 'EMAIL', etiquette: '[EMAIL]', re: /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu },
  { categorie: 'URL', etiquette: '[URL]', re: /\b(?:https?:\/\/|www\.)[^\s]+/giu },
  { categorie: 'TELEPHONE', etiquette: '[TÉLÉPHONE]', re: /(?<![\p{N}])(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}(?![\p{N}])/gu },
  { categorie: 'DATE', etiquette: '[DATE]', re: new RegExp(`(?<![\\p{N}])(?:\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}|\\d{1,2}(?:er)?\\s+(?:${MOIS})(?:\\s+\\d{4})?)(?![\\p{N}])`, 'giu') },
  { categorie: 'NUMERO', etiquette: '[NUMÉRO]', re: /(?<![\p{N}])\d{5,}(?![\p{N}])/gu },
  // Suite de mots à majuscule (« Paul Durand », « Leroy Merlin Rennes »).
  { categorie: 'NOM_PROPRE', etiquette: '[NOM]', re: /(?<![\p{L}\p{N}])\p{Lu}[\p{L}'’-]*\p{L}(?:\s+\p{Lu}[\p{L}'’-]*\p{L})*/gu },
]

// Mots à majuscule qui ne sont presque jamais des noms propres.
const MOTS_COURANTS = new Set(('je j il elle on nous vous ils elles le la les un une des du de mon ma mes ton ta tes son sa ses notre votre leur leurs ce cet cette ces ' +
  'et mais ou donc or ni car si quand comme alors puis enfin aussi oui non ok bonjour merci madame monsieur mme mr mlle ' +
  'avec chez pour par dans sur sous sans entre vers depuis pendant après avant au aux en à a y ' +
  'hier demain aujourd’hui aujourd\'hui ici là parfois souvent toujours jamais très tout tous toute toutes ' +
  'qui que quoi dont où pourquoi comment personnellement franchement honnêtement ' +
  'lundi mardi mercredi jeudi vendredi samedi dimanche ' + MOIS.replace(/\|/g, ' ')).split(' '))

// Le mot commence-t-il une phrase ? (début du texte, ou après . ! ? … ou un saut de ligne)
function debutDePhrase(texte, index) {
  const avant = texte.slice(0, index).replace(/[\s"«»“”'(]+$/u, '')
  return avant === '' || /[.!?…:\n]$/u.test(avant)
}

// Passages suspects d'un texte : [{ texte, categorie, etiquette, debut, fin }],
// sans chevauchement (le premier détecteur de la liste l'emporte).
function detecter(texte) {
  if (typeof texte !== 'string' || !texte.trim()) return []
  const trouves = []
  for (const d of DETECTEURS) {
    for (const m of texte.matchAll(d.re)) {
      let passage = m[0].replace(/[.,;:!?)»”]+$/u, '')
      if (!passage) continue
      if (d.categorie === 'NOM_PROPRE') {
        // Un mot courant en tête (« Mon » dans « Mon Paul ») ne fait pas
        // partie du nom : on le retire, avec l'espace qui suit.
        let debut = m.index
        let mots = passage.split(/\s+/)
        while (mots.length && MOTS_COURANTS.has(mots[0].toLowerCase())) {
          const reste = passage.slice(mots[0].length).replace(/^\s+/u, '')
          debut += passage.length - reste.length
          passage = reste
          mots = mots.slice(1)
        }
        if (!mots.length) continue
        // Un seul mot en début de phrase : sans doute une simple majuscule.
        if (mots.length === 1 && debutDePhrase(texte, debut)) continue
        if (mots.length === 1 && passage.length < 3) continue
        trouves.push({ texte: texte.slice(debut, debut + passage.length), categorie: d.categorie, etiquette: d.etiquette, debut, fin: debut + passage.length })
        continue
      }
      trouves.push({ texte: passage, categorie: d.categorie, etiquette: d.etiquette, debut: m.index, fin: m.index + passage.length })
    }
  }
  // Pas de chevauchement : on garde le premier trouvé (ordre des détecteurs).
  const gardes = []
  for (const t of trouves) {
    if (!gardes.some((g) => t.debut < g.fin && g.debut < t.fin)) gardes.push(t)
  }
  return gardes.sort((a, b) => a.debut - b.debut)
}

// Suggestions pour une réponse entière : passages distincts (texte unique).
function suggestionsPour(value) {
  const vus = new Map()
  for (const t of textesDe(value)) {
    for (const s of detecter(t)) if (!vus.has(s.texte)) vus.set(s.texte, { texte: s.texte, categorie: s.categorie, etiquette: s.etiquette })
  }
  return [...vus.values()]
}

// ── Validation d'un masque reçu du navigateur ───────────────────────────────
// Le passage doit exister tel quel dans la réponse ; l'étiquette est une des
// étiquettes proposées, ou une étiquette libre entre crochets.
function etiquetteValide(e) {
  return typeof e === 'string' && (ETIQUETTES.includes(e) || /^\[[\p{L}\p{N} _'’-]{1,30}\]$/u.test(e))
}
function masqueValide(value, masque) {
  const { texte, etiquette } = masque || {}
  if (typeof texte !== 'string' || !texte.trim() || texte.length > LONGUEUR_MAX_PASSAGE) return false
  if (!etiquetteValide(etiquette)) return false
  return textesDe(value).some((t) => t.includes(texte))
}

// Écritures d'un passage présentes dans une réponse, pour « Masquer partout » :
// en mots entiers seulement, dans toutes les casses (« Paul Durand » trouve
// « paul durand », mais « Al » ne trouve ni « Alain » ni le « al » de
// « journal »).
function variantesDe(value, texte) {
  if (typeof texte !== 'string' || !texte.trim()) return []
  const motEntier = new RegExp(`(?<!${LETTRE})${echapper(texte)}(?!${LETTRE})`, 'giu')
  const variantes = new Set()
  for (const t of textesDe(value)) {
    for (const m of t.matchAll(motEntier)) variantes.add(m[0])
  }
  return [...variantes]
}

// Une réponse garde-t-elle un passage signalé que le chercheur n'a pas masqué ?
function resteASignaler(value, masques) {
  // Un passage est couvert quand, masques appliqués, il ne reste que des
  // étiquettes (« Marie-Claire » par le masque « Marie »). « Paul Durand » avec
  // le seul masque « Paul » reste signalé : « Durand » est encore lisible.
  return suggestionsPour(value).some((s) => appliquerMasques(s.texte, masques).replace(/\[[^\]]*\]/gu, '').trim() !== '')
}

module.exports = {
  TYPES_LIBRES, ETIQUETTES, textesDe, appliquerMasques, masquerReponses,
  detecter, suggestionsPour, etiquetteValide, masqueValide, variantesDe, resteASignaler,
}
