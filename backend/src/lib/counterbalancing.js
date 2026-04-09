// ─── MOTEUR DE CONTREBALANCEMENT ─────────────────────────────────────────────
// Fonctions pures sans dépendance DB — testables en isolation.

/**
 * Génère un carré latin k×k par rotation classique.
 * Ligne i, colonne j → (i + j) % k
 * @param {number} k - nombre de conditions
 * @returns {number[][]} matrice k×k
 */
function generateLatinSquare(k) {
  if (k < 2) return [[0]]
  const square = []
  for (let i = 0; i < k; i++) {
    const row = []
    for (let j = 0; j < k; j++) {
      row.push((i + j) % k)
    }
    square.push(row)
  }
  return square
}

/**
 * Génère un design Williams (séquences équilibrées de premier ordre).
 * Chaque condition est immédiatement précédée par chaque autre exactement 1 fois.
 *
 * k pair  → k séquences
 * k impair → 2k séquences (k + leurs inverses)
 *
 * Formule Williams (1949) pour k pair :
 *   position 0 : i
 *   position j (impair) : (i + Math.ceil(j/2)) % k
 *   position j (pair>0)  : (i + k - Math.floor(j/2)) % k
 *
 * @param {number} k - nombre de conditions
 * @returns {number[][]} séquences Williams
 */
function generateWilliamsDesign(k) {
  if (k < 2) return [[0]]

  const sequences = []

  for (let i = 0; i < k; i++) {
    const row = new Array(k)
    for (let j = 0; j < k; j++) {
      if (j === 0) {
        row[j] = i
      } else if (j % 2 === 1) {
        row[j] = (i + Math.ceil(j / 2)) % k
      } else {
        row[j] = (i + k - Math.floor(j / 2)) % k
      }
    }
    sequences.push(row)
  }

  // Pour k impair, ajouter les séquences inversées pour obtenir l'équilibre complet
  if (k % 2 === 1) {
    for (let i = 0; i < k; i++) {
      sequences.push([...sequences[i]].reverse())
    }
  }

  return sequences
}

/**
 * Produit cartésien de tableaux.
 * cartesian([[A,B], [1,2]]) → [[A,1],[A,2],[B,1],[B,2]]
 */
function cartesian(arrays) {
  if (arrays.length === 0) return [[]]
  return arrays.reduce(
    (acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])),
    [[]]
  )
}

/**
 * Alloue un participant à une condition.
 *
 * @param {Object} design - { designType, counterbalanceMethod, quotaMode, targetN }
 * @param {Object[]} factors - [{ id, name, type, levels: [{ id, name, code }] }]
 * @param {Object[]} existingSessions - [{ id, status, counterbalanceIndex, conditionAssignments: [{ factorLevelId }] }]
 * @returns {{ betweenAssignments: {factorId,levelId}[], withinOrder: string[], counterbalanceIndex: number } | { full: true }}
 */
function allocateParticipant(design, factors, existingSessions) {
  const activeSessions = existingSessions.filter((s) => s.status !== 'EXCLUDED')

  const betweenFactors = factors.filter((f) => f.type === 'BETWEEN')
  const withinFactors = factors.filter((f) => f.type === 'WITHIN')

  let betweenAssignments = []
  let withinOrder = []
  let counterbalanceIndex = 0

  // ── Facteurs BETWEEN : allocation au groupe le moins rempli ────────────────

  if (betweenFactors.length > 0) {
    // Construire toutes les cellules (produit cartésien des niveaux between)
    const levelArrays = betweenFactors.map((f) => f.levels.map((l) => ({ factorId: f.id, levelId: l.id })))
    const cells = cartesian(levelArrays)

    // Compter les participants par cellule
    const cellCounts = cells.map((cell) => {
      const count = activeSessions.filter((s) => {
        return cell.every((c) =>
          s.conditionAssignments.some((a) => a.factorLevelId === c.levelId)
        )
      }).length
      return { cell, count }
    })

    // Vérifier les quotas
    const quotaPerCell = design.quotaMode === 'STRICT'
      ? Math.floor(design.targetN / cells.length)
      : Math.ceil((design.targetN / cells.length) * 1.1)

    const allFull = cellCounts.every((cc) => cc.count >= quotaPerCell)
    if (allFull) return { full: true }

    // Choisir la cellule avec le moins de participants (exclure les pleines en mode strict)
    const available = design.quotaMode === 'STRICT'
      ? cellCounts.filter((cc) => cc.count < quotaPerCell)
      : cellCounts

    const minCount = Math.min(...available.map((cc) => cc.count))
    const candidates = available.filter((cc) => cc.count === minCount)
    const chosen = candidates[Math.floor(Math.random() * candidates.length)]

    betweenAssignments = chosen.cell
  } else {
    // Pas de facteur between : vérifier le quota global
    const quotaLimit = design.quotaMode === 'STRICT'
      ? design.targetN
      : Math.ceil(design.targetN * 1.1)

    if (activeSessions.length >= quotaLimit) return { full: true }
  }

  // ── Facteurs WITHIN : contrebalancement ───────────────────────────────────

  if (withinFactors.length > 0) {
    // Pour simplifier, on contrebalance le premier facteur within
    // Les designs mixtes complexes utilisent le premier facteur within pour l'ordre
    const withinFactor = withinFactors[0]
    const k = withinFactor.levels.length

    let sequences
    switch (design.counterbalanceMethod) {
      case 'WILLIAMS':
        sequences = generateWilliamsDesign(k)
        break
      case 'RANDOM': {
        // Ordre aléatoire unique pour ce participant
        const indices = Array.from({ length: k }, (_, i) => i)
        for (let i = k - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[indices[i], indices[j]] = [indices[j], indices[i]]
        }
        withinOrder = indices.map((i) => withinFactor.levels[i].id)
        counterbalanceIndex = activeSessions.length
        return { betweenAssignments, withinOrder, counterbalanceIndex }
      }
      default: // LATIN_SQUARE
        sequences = generateLatinSquare(k)
    }

    // Compter combien de participants ont chaque index de contrebalancement
    const indexCounts = new Map()
    for (let i = 0; i < sequences.length; i++) {
      indexCounts.set(i, 0)
    }
    for (const s of activeSessions) {
      const idx = s.counterbalanceIndex % sequences.length
      indexCounts.set(idx, (indexCounts.get(idx) || 0) + 1)
    }

    // Choisir l'index le moins utilisé
    let minIdx = 0
    let minVal = Infinity
    for (const [idx, count] of indexCounts) {
      if (count < minVal) {
        minVal = count
        minIdx = idx
      }
    }

    counterbalanceIndex = minIdx
    const sequence = sequences[minIdx]
    withinOrder = sequence.map((i) => withinFactor.levels[i].id)
  }

  return { betweenAssignments, withinOrder, counterbalanceIndex }
}

/**
 * Calcule l'ordre des blocs pour un participant donné.
 *
 * @param {Object[]} blocks - blocs de l'étude triés par order, [{ id, type, order, label }]
 * @param {Object} assignment - { betweenAssignments: [{factorId,levelId}], withinOrder: [levelId] }
 * @param {Object[]} factors - avec leurs levels et blockIds
 * @returns {string[]} array d'IDs de blocs dans l'ordre
 */
function computeBlockOrder(blocks, assignment, factors) {
  // Construire un map : blockId → quels factorLevels le référencent
  const blockToLevels = new Map()
  const levelToFactor = new Map()
  const factorTypeMap = new Map()

  for (const factor of factors) {
    factorTypeMap.set(factor.id, factor.type)
    for (const level of factor.levels) {
      levelToFactor.set(level.id, factor.id)
      const bIds = Array.isArray(level.blockIds) ? level.blockIds : JSON.parse(level.blockIds || '[]')
      for (const bId of bIds) {
        if (!blockToLevels.has(bId)) blockToLevels.set(bId, [])
        blockToLevels.get(bId).push({ factorId: factor.id, levelId: level.id })
      }
    }
  }

  // Séparer les blocs en : liés à des facteurs between, liés à within, non liés
  const assignedBetweenLevels = new Set(assignment.betweenAssignments.map((a) => a.levelId))
  const withinOrderSet = new Set(assignment.withinOrder)

  // Phase 1 : filtrer les blocs between
  let filteredBlocks = blocks.filter((block) => {
    const linkedLevels = blockToLevels.get(block.id)
    if (!linkedLevels || linkedLevels.length === 0) return true // pas lié = toujours inclus

    // Si le bloc est lié à un facteur BETWEEN, inclure seulement si le niveau est assigné
    const betweenLinks = linkedLevels.filter((l) => factorTypeMap.get(l.factorId) === 'BETWEEN')
    if (betweenLinks.length > 0) {
      return betweenLinks.some((l) => assignedBetweenLevels.has(l.levelId))
    }

    return true // les blocs within passent le filtre ici
  })

  // Phase 2 : réordonner les blocs within
  if (assignment.withinOrder.length > 0) {
    // Identifier les blocs liés aux facteurs within
    const withinBlocks = []
    const nonWithinBlocks = []

    for (const block of filteredBlocks) {
      const linkedLevels = blockToLevels.get(block.id) || []
      const withinLinks = linkedLevels.filter((l) => factorTypeMap.get(l.factorId) === 'WITHIN')
      if (withinLinks.length > 0) {
        withinBlocks.push({ block, levelId: withinLinks[0].levelId })
      } else {
        nonWithinBlocks.push(block)
      }
    }

    // Trier les blocs within selon l'ordre de contrebalancement
    const levelOrder = new Map(assignment.withinOrder.map((lid, i) => [lid, i]))
    withinBlocks.sort((a, b) => (levelOrder.get(a.levelId) ?? 999) - (levelOrder.get(b.levelId) ?? 999))

    // Reconstruire : blocs non-within gardent leur position relative,
    // les blocs within sont insérés à la position du premier bloc within original
    const result = []
    let withinInserted = false
    const firstWithinOrder = withinBlocks.length > 0
      ? Math.min(...withinBlocks.map((wb) => wb.block.order))
      : Infinity

    for (const block of filteredBlocks) {
      const linkedLevels = blockToLevels.get(block.id) || []
      const isWithin = linkedLevels.some((l) => factorTypeMap.get(l.factorId) === 'WITHIN')

      if (isWithin) {
        if (!withinInserted) {
          // Insérer tous les blocs within triés ici
          for (const wb of withinBlocks) result.push(wb.block)
          withinInserted = true
        }
        // Skip — déjà inséré
      } else {
        result.push(block)
      }
    }

    return result.map((b) => b.id)
  }

  return filteredBlocks.map((b) => b.id)
}

/**
 * Vérifie si l'étude est pleine (tous les quotas remplis).
 */
function isStudyFull(design, factors, existingSessions) {
  const result = allocateParticipant(design, factors, existingSessions)
  return result.full === true
}

module.exports = {
  generateLatinSquare,
  generateWilliamsDesign,
  allocateParticipant,
  computeBlockOrder,
  isStudyFull,
  cartesian,
}
