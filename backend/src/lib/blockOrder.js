// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── ORDRE DE PRÉSENTATION DES BLOCS POUR L'EXPORT ───────────────────────────
// Fonctions pures (sans DB) servant à exporter, par participant·e, la position
// des blocs dont l'ordre varie d'une passation à l'autre — pour analyser les
// effets d'ordre. On cible deux cas :
//   • blocs rattachés à un facteur WITHIN (ordre contrebalancé) ;
//   • blocs en groupe de randomisation (settings.randomGroup).
// Les blocs BETWEEN sont volontairement exclus : leur information pertinente
// est « quelle condition », déjà couverte par les colonnes condition_*.
// Extrait de routes/export.js pour être testable en isolation.

// Slug ASCII pour en-têtes de colonnes (accents retirés, espaces → _).
const slugify = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30)

/**
 * Détermine les blocs « ordonnables » d'une étude (within + randomGroup),
 * dédupliqués, dans l'ordre naturel de l'étude. Slugs uniques garantis
 * (désambiguïsation par numéro d'ordre en cas de noms identiques).
 * @returns {{ id, name, slug }[]}
 */
function computeOrderedBlocks(study) {
  const factors = study.design?.factors ?? []
  const withinBlockIds = new Set()
  for (const factor of factors) {
    if (factor.type !== 'WITHIN') continue
    for (const level of factor.levels) {
      const ids = Array.isArray(level.blockIds)
        ? level.blockIds
        : (() => { try { return JSON.parse(level.blockIds || '[]') } catch { return [] } })()
      ids.forEach((bid) => withinBlockIds.add(bid))
    }
  }

  const result = []
  const usedSlugs = new Set()
  for (const b of study.blocks) {
    const hasRandomGroup = !!(b.settings && b.settings.randomGroup)
    const isWithin = withinBlockIds.has(b.id)
    if (!hasRandomGroup && !isWithin) continue

    const name = b.settings?.name || b.label || `Bloc ${b.order + 1}`
    let slug = slugify(name) || `bloc_${b.order + 1}`
    if (usedSlugs.has(slug)) slug = `${slug}_${b.order + 1}`
    usedSlugs.add(slug)
    result.push({ id: b.id, name, slug })
  }
  return result
}

/**
 * Pour un blockOrder de session donné, calcule la position (1-based) de
 * chaque bloc ordonnable et la chaîne lisible « A > B > C ».
 * Les blocs absents du parcours (ex. bloc d'une condition between non vue)
 * reçoivent une position vide.
 * @returns {{ positions: Object<string,number|''>, readable: string }}
 */
function orderInfoForSession(blockOrder, orderedBlocks) {
  const order = Array.isArray(blockOrder) ? blockOrder : []
  const posById = new Map()
  order.forEach((bid, i) => { if (!posById.has(bid)) posById.set(bid, i + 1) })

  const positions = {}
  const present = []
  for (const ob of orderedBlocks) {
    const pos = posById.get(ob.id)
    positions[ob.slug] = pos ?? ''
    if (pos) present.push({ name: ob.name, pos })
  }
  present.sort((a, b) => a.pos - b.pos)
  return { positions, readable: present.map((x) => x.name).join(' > ') }
}

module.exports = { slugify, computeOrderedBlocks, orderInfoForSession }
