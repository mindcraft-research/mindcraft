// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── REPRISE D'ÉLÉMENTS D'UNE LISTE FERMÉE (exports) ──────────────────────────
// Un Classement ou une Matrice peut reprendre comme éléments (settings.itemsSource) :
//   - les mots d'une « Liste de mots » (liste ouverte, codes w1, w2… : format
//     EVOC, géré dans routes/export.js) ;
//   - les choix COCHÉS d'une question à cases à cocher, ou les éléments rangés
//     dans UNE catégorie (itemsSource.zone) d'un glisser-déposer (liste fermée).
// Pour une liste fermée, les éléments gardent le code du choix d'origine :
//   Classement → <code>1, <code>2, … = le code de l'élément classé à ce rang ;
//   Matrice    → <code>_<code du choix>, comme une matrice ordinaire.
// Côté passation : frontend/src/lib/reprise.js (mêmes types).

const TYPES_FERMES = ['CHECKBOX', 'MEDIA_CHECKBOX', 'CHECKBOX_COMMENT', 'DRAG_DROP']

// Questions sources à liste fermée de l'étude : Map(code → { type, choix: [{ code, label }], zones }).
function sourcesFermees(study) {
  const out = new Map()
  for (const b of study.blocks || []) {
    if (b.type !== 'QUESTION') continue
    for (const q of b.questions || []) {
      if (!q.code || !TYPES_FERMES.includes(q.type) || out.has(q.code)) continue
      if (q.settings?.itemsSource?.fromCode) continue // source elle-même reprise : non prise en charge
      out.set(q.code, {
        type: q.type,
        choix: (q.choices || []).map((c) => ({ code: c.code, label: c.label })),
        zones: Array.isArray(q.settings?.zones) ? q.settings.zones : [],
      })
    }
  }
  return out
}

// Source fermée d'un Classement / d'une Matrice, ou null (pas de reprise, ou
// reprise d'une « Liste de mots »).
function sourceFermeeDe(q, sources) {
  if (q.type !== 'RANKING' && q.type !== 'MATRIX') return null
  const code = q.settings?.itemsSource?.fromCode
  return (code && sources.get(code)) || null
}

// Colonnes d'export d'une question reprenant une liste fermée.
function colonnesFermees(q, source, { pfx = '', blockId = null, scale = null } = {}) {
  if (q.type === 'MATRIX') {
    return source.choix.map((c) => ({ header: `${pfx}${q.code}_${c.code}`, questionCode: q.code, itemCode: c.code, scale, blockId }))
  }
  return source.choix.map((_, i) => ({ header: `${pfx}${q.code}${i + 1}`, questionCode: q.code, blockId, rankPos: i + 1, ferme: true }))
}

// Cellule « rang i » d'un Classement repris d'une liste fermée.
const celluleRangFerme = (col, value) => {
  const ordre = Array.isArray(value) ? value : []
  return ordre[col.rankPos - 1] ?? ''
}

// Texte du codebook pour une question reprenant une liste fermée.
function texteCodebookFerme(q, source, zone) {
  const src = q.settings.itemsSource.fromCode
  const quoi = source.type === 'DRAG_DROP'
    ? `éléments rangés dans la catégorie « ${(source.zones.find((z) => z.code === zone)?.label) || zone || '?'} » de « ${src} »`
    : `choix cochés à « ${src} »`
  return q.type === 'MATRIX'
    ? `Jugement des ${quoi}. Export : ${q.code}_<code du choix> = la valeur pour chaque élément (vide s'il n'a pas été présenté).`
    : `Classement des ${quoi}. Export : ${q.code}1, ${q.code}2, … = le code (celui de « ${src} ») de l'élément classé à ce rang.`
}

module.exports = { TYPES_FERMES, sourcesFermees, sourceFermeeDe, colonnesFermees, celluleRangFerme, texteCodebookFerme }
