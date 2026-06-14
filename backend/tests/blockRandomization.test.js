// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de la randomisation inter-blocs et de son illustration dans l'export.
//
// Couvre deux questions :
//   1. Le random des blocs fonctionne-t-il ? (shuffleRandomGroups, computeBlockOrder)
//   2. S'illustre-t-il correctement dans les données ? (computeOrderedBlocks,
//      orderInfoForSession — helpers réellement utilisés par l'export CSV/Excel)

import { describe, it, expect } from 'vitest'
import {
  shuffleRandomGroups,
  computeBlockOrder,
} from '../src/lib/counterbalancing.js'
import {
  computeOrderedBlocks,
  orderInfoForSession,
} from '../src/lib/blockOrder.js'

// ── Helpers de test ─────────────────────────────────────────────────────────
const blk = (id, order, extra = {}) => ({ id, order, type: 'QUESTION', label: id, settings: {}, ...extra })

// 3 blocs dans un même groupe random A, encadrés par 2 blocs fixes.
function makeRandomGroupStudy() {
  return [
    blk('intro', 0, { type: 'WELCOME', settings: { name: 'Intro' } }),
    blk('bras', 1, { settings: { name: 'Bras robotique', randomGroup: 'A' } }),
    blk('amr', 2, { settings: { name: 'Robot AMR', randomGroup: 'A' } }),
    blk('quad', 3, { settings: { name: 'Robot quadrupède', randomGroup: 'A' } }),
    blk('fin', 4, { type: 'DEBRIEFING', settings: { name: 'Fin' } }),
  ]
}

describe('shuffleRandomGroups — le random des blocs fonctionne', () => {
  const blocks = makeRandomGroupStudy()
  const naturalOrder = blocks.map((b) => b.id)

  it('garde tous les blocs, exactement une fois chacun', () => {
    for (let i = 0; i < 50; i++) {
      const out = shuffleRandomGroups(naturalOrder, blocks)
      expect(out).toHaveLength(5)
      expect([...out].sort()).toEqual([...naturalOrder].sort())
    }
  })

  it('laisse les blocs hors-groupe à leur position', () => {
    for (let i = 0; i < 50; i++) {
      const out = shuffleRandomGroups(naturalOrder, blocks)
      expect(out[0]).toBe('intro') // 1er toujours intro
      expect(out[4]).toBe('fin')   // dernier toujours fin
    }
  })

  it('ne place QUE des blocs du groupe A aux positions 1..3', () => {
    const groupA = new Set(['bras', 'amr', 'quad'])
    for (let i = 0; i < 50; i++) {
      const out = shuffleRandomGroups(naturalOrder, blocks)
      expect(groupA.has(out[1])).toBe(true)
      expect(groupA.has(out[2])).toBe(true)
      expect(groupA.has(out[3])).toBe(true)
    }
  })

  it('produit réellement des ordres différents (randomise)', () => {
    const seen = new Set()
    for (let i = 0; i < 200; i++) {
      seen.add(shuffleRandomGroups(naturalOrder, blocks).join(','))
    }
    // 3 blocs → 6 permutations possibles ; on doit en voir plusieurs.
    expect(seen.size).toBeGreaterThan(1)
  })

  it('couvre les 6 permutations et reste approximativement uniforme', () => {
    const counts = {}
    const N = 6000
    for (let i = 0; i < N; i++) {
      const out = shuffleRandomGroups(naturalOrder, blocks)
      const key = [out[1], out[2], out[3]].join(',')
      counts[key] = (counts[key] || 0) + 1
    }
    // Les 6 permutations des 3 blocs doivent toutes apparaître.
    expect(Object.keys(counts)).toHaveLength(6)
    // Chaque permutation ~ N/6 ≈ 1000. Tolérance large (±40 %) pour éviter
    // la flakiness tout en détectant un biais grossier.
    const expected = N / 6
    for (const key of Object.keys(counts)) {
      expect(counts[key]).toBeGreaterThan(expected * 0.6)
      expect(counts[key]).toBeLessThan(expected * 1.4)
    }
  })

  it('ne touche pas un groupe d\'un seul bloc', () => {
    const solo = [
      blk('a', 0),
      blk('b', 1, { settings: { name: 'Solo', randomGroup: 'Z' } }),
      blk('c', 2),
    ]
    const order = ['a', 'b', 'c']
    for (let i = 0; i < 20; i++) {
      expect(shuffleRandomGroups(order, solo)).toEqual(['a', 'b', 'c'])
    }
  })
})

describe('computeBlockOrder — ordre intra-sujet (within) contrebalancé', () => {
  // Facteur within « Robot » à 3 niveaux, chacun lié à un bloc.
  const blocks = [
    blk('intro', 0, { type: 'WELCOME' }),
    blk('bras', 1),
    blk('amr', 2),
    blk('quad', 3),
    blk('fin', 4, { type: 'DEBRIEFING' }),
  ]
  const factors = [{
    id: 'f1', type: 'WITHIN',
    levels: [
      { id: 'lvl_bras', blockIds: ['bras'] },
      { id: 'lvl_amr', blockIds: ['amr'] },
      { id: 'lvl_quad', blockIds: ['quad'] },
    ],
  }]

  it('réordonne les blocs within selon withinOrder, fixes inchangés', () => {
    const assignment = {
      betweenAssignments: [],
      withinOrder: ['lvl_quad', 'lvl_bras', 'lvl_amr'],
    }
    const order = computeBlockOrder(blocks, assignment, factors)
    expect(order[0]).toBe('intro')
    expect(order[order.length - 1]).toBe('fin')
    // Les 3 blocs within suivent l'ordre demandé.
    const withinPart = order.filter((id) => ['bras', 'amr', 'quad'].includes(id))
    expect(withinPart).toEqual(['quad', 'bras', 'amr'])
  })
})

describe('export — l\'ordre s\'illustre dans les données', () => {
  const study = { blocks: makeRandomGroupStudy(), design: null }

  it('computeOrderedBlocks ne retient que les blocs randomGroup (pas les fixes)', () => {
    const ob = computeOrderedBlocks(study)
    expect(ob.map((b) => b.id).sort()).toEqual(['amr', 'bras', 'quad'])
    // Slugs lisibles dérivés du nom.
    const slugs = Object.fromEntries(ob.map((b) => [b.id, b.slug]))
    expect(slugs.bras).toBe('bras_robotique')
    expect(slugs.amr).toBe('robot_amr')
    expect(slugs.quad).toBe('robot_quadrupede')
  })

  it('orderInfoForSession produit positions + chaîne lisible cohérentes', () => {
    const ob = computeOrderedBlocks(study)
    // blockOrder tel que persisté en session après shuffle.
    const blockOrder = ['intro', 'amr', 'quad', 'bras', 'fin']
    const { positions, readable } = orderInfoForSession(blockOrder, ob)

    const slug = Object.fromEntries(ob.map((b) => [b.id, b.slug]))
    expect(positions[slug.amr]).toBe(2)
    expect(positions[slug.quad]).toBe(3)
    expect(positions[slug.bras]).toBe(4)
    expect(readable).toBe('Robot AMR > Robot quadrupède > Bras robotique')
  })

  it('cohérence bout-en-bout : shuffle → positions retrouvées dans l\'ordre', () => {
    const ob = computeOrderedBlocks(study)
    const naturalOrder = study.blocks.map((b) => b.id)
    for (let i = 0; i < 30; i++) {
      const blockOrder = shuffleRandomGroups(naturalOrder, study.blocks)
      const { positions, readable } = orderInfoForSession(blockOrder, ob)
      // Les 3 positions doivent être exactement {2,3,4} (entre intro=1 et fin=5).
      const posValues = ob.map((b) => positions[b.slug]).sort()
      expect(posValues).toEqual([2, 3, 4])
      // La chaîne lisible reflète l'ordre réel du blockOrder.
      const expectedReadable = blockOrder
        .filter((id) => ['bras', 'amr', 'quad'].includes(id))
        .map((id) => study.blocks.find((b) => b.id === id).settings.name)
        .join(' > ')
      expect(readable).toBe(expectedReadable)
    }
  })

  it('bloc non présenté (absent du blockOrder) → position vide', () => {
    const ob = computeOrderedBlocks(study)
    const blockOrder = ['intro', 'amr', 'fin'] // quad et bras non vus
    const { positions } = orderInfoForSession(blockOrder, ob)
    const slug = Object.fromEntries(ob.map((b) => [b.id, b.slug]))
    expect(positions[slug.amr]).toBe(2)
    expect(positions[slug.bras]).toBe('')
    expect(positions[slug.quad]).toBe('')
  })

  it('désambiguïse les slugs quand deux blocs ont le même nom', () => {
    const dupStudy = {
      design: null,
      blocks: [
        blk('b1', 0, { settings: { name: 'Bloc test', randomGroup: 'A' } }),
        blk('b2', 1, { settings: { name: 'Bloc test', randomGroup: 'A' } }),
      ],
    }
    const ob = computeOrderedBlocks(dupStudy)
    const slugs = ob.map((b) => b.slug)
    expect(new Set(slugs).size).toBe(2) // pas de collision
  })
})
