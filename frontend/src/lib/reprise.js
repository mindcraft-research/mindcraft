// ─── REPRISE D'ÉLÉMENTS D'UNE QUESTION PRÉCÉDENTE ────────────────────────────
// Un Classement (RANKING) ou une Matrice (MATRIX) — et un glisser-déposer, pour
// la Liste de mots — peut prendre ses éléments dans la réponse donnée à une
// question précédente (settings.itemsSource = { fromCode, zone? }) :
//   - « Liste de mots » : les mots saisis (liste ouverte), codes w1, w2… ;
//   - cases à cocher : les choix cochés, dans l'ordre de la question source ;
//   - glisser-déposer : les éléments rangés dans la catégorie `zone`.
// Pour une liste fermée, chaque élément garde le code et le libellé du choix
// d'origine (exports reliables à la question source). Côté exports :
// backend/src/lib/reprise.js.

export const TYPES_SOURCES = {
  WORD_LIST: 'Liste de mots',
  CHECKBOX: 'Cases à cocher',
  MEDIA_CHECKBOX: 'Cases à cocher (médias)',
  CHECKBOX_COMMENT: 'Choix multiple + commentaire',
  DRAG_DROP: 'Glisser-déposer',
}

// Codes choisis à la question source, selon son type.
function codesChoisis(source, reponse, zone) {
  if (source.type === 'DRAG_DROP') return zone && reponse && typeof reponse === 'object' ? (reponse[zone] || []) : []
  if (source.type === 'CHECKBOX_COMMENT') return Array.isArray(reponse?.choices) ? reponse.choices : []
  return Array.isArray(reponse) ? reponse : []
}

// Renvoie la question avec ses éléments repris (inchangée sans reprise).
// questionsParCode : questions de l'étude par code (pour les listes fermées).
export function elementsRepris(q, previousResponses, questionsParCode = {}) {
  const { fromCode, zone } = q.settings?.itemsSource || {}
  if (!fromCode) return q
  const reponse = previousResponses?.[fromCode]
  const source = questionsParCode[fromCode]
  let items
  if (!source || source.type === 'WORD_LIST') {
    // Liste de mots : un élément par mot, codes de position stables (w1, w2…),
    // sans collision si un mot est saisi deux fois.
    const mots = Array.isArray(reponse) ? reponse.filter((w) => typeof w === 'string' && w.trim() !== '') : []
    items = mots.map((w, i) => ({ id: `w${i + 1}`, code: `w${i + 1}`, label: w }))
  } else {
    const choisis = codesChoisis(source, reponse, zone).map(String)
    const parCode = new Map((source.choices || []).map((c) => [String(c.code), c]))
    // Cases à cocher : ordre de la question source ; glisser-déposer : ordre de dépôt.
    const codes = source.type === 'DRAG_DROP' ? choisis : (source.choices || []).map((c) => String(c.code)).filter((c) => choisis.includes(c))
    items = codes.filter((c) => parCode.has(c)).map((c) => ({ id: c, code: c, label: parCode.get(c).label || c }))
  }
  if (q.type === 'MATRIX') return { ...q, matrixItems: items }
  if (q.type === 'RANKING' || q.type === 'DRAG_DROP') return { ...q, choices: items }
  return q
}
