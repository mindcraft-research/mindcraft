// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── RÈGLES « CONDITION EXPÉRIMENTALE » DES BLOCS-LOGIQUES ───────────────────
// Une règle CONDITION_ASSIGNMENT stocke l'id d'un niveau de facteur
// (settings.rules[].levelId). Quand on copie une étude (ou un bloc vers une
// autre étude), les niveaux reçoivent de nouveaux ids : il faut réécrire ces
// règles, sinon elles pointent sur les niveaux de l'étude d'origine et ne sont
// jamais vraies. Fonctions pures (sans DB), testables en isolation.

const estObjet = (v) => v && typeof v === 'object' && !Array.isArray(v)
const cle = (s) => String(s ?? '').trim().toLowerCase()

/**
 * Réécrit les levelId des règles CONDITION_ASSIGNMENT d'un bloc-logique.
 * Un levelId sans correspondance devient null (« Choisir un niveau… » dans
 * l'inspecteur). Les règles sans levelId et les autres types sont inchangés.
 * @param {Object} settings - settings du bloc LOGIC
 * @param {Map<string,string>} idNiveau - ancien id de niveau → nouveau
 * @returns {{ settings: Object, perdues: number }} perdues = règles vidées
 */
function remapperNiveauxRegles(settings, idNiveau) {
  if (!estObjet(settings) || !Array.isArray(settings.rules)) return { settings, perdues: 0 }
  let perdues = 0
  const rules = settings.rules.map((r) => {
    if (!estObjet(r) || r.type !== 'CONDITION_ASSIGNMENT' || !r.levelId) return r
    const levelId = idNiveau.get(String(r.levelId)) || null
    if (!levelId) perdues++
    return { ...r, levelId }
  })
  return { settings: { ...settings, rules }, perdues }
}

/**
 * Correspondance des niveaux entre deux plans expérimentaux (copie d'un bloc
 * vers une autre étude) : même nom de facteur et même code de niveau
 * (espaces et casse ignorés). Premier facteur trouvé en cas de doublon.
 * @param {{ name, levels: { id, code }[] }[]} facteursSource
 * @param {{ name, levels: { id, code }[] }[]} facteursCible
 * @returns {Map<string,string>} id du niveau source → id du niveau cible
 */
function correspondanceNiveaux(facteursSource, facteursCible) {
  const idNiveau = new Map()
  const cible = Array.isArray(facteursCible) ? facteursCible : []
  for (const fs of Array.isArray(facteursSource) ? facteursSource : []) {
    const fc = cible.find((f) => cle(f.name) === cle(fs.name))
    if (!fc) continue
    for (const ls of fs.levels || []) {
      const lc = (fc.levels || []).find((l) => cle(l.code) !== '' && cle(l.code) === cle(ls.code))
      if (lc) idNiveau.set(String(ls.id), lc.id)
    }
  }
  return idNiveau
}

module.exports = { remapperNiveauxRegles, correspondanceNiveaux }
