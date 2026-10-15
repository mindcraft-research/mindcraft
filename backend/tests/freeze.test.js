// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du gel du matériel (lib/freeze.js).

import { describe, it, expect } from 'vitest'
import { canonique, empreinteEtude, empreinteCourte, figerSiPremierParticipant } from '../src/lib/freeze.js'

const etude = (texte = 'Q ?', extra = {}) => ({
  id: 'S1', name: 'Étude', version: 3, status: 'COLLECTING', updatedAt: new Date('2026-01-01'),
  blocks: [{
    id: 'b1', order: 0, type: 'QUESTION', settings: { name: 'Page 1' }, createdAt: new Date('2026-01-01'),
    questions: [{ id: 'q1', blockId: 'b1', code: 'Q1', type: 'RADIO', text: texte, order: 0, settings: {}, choices: [{ id: 'c1', code: 'a', label: 'Oui', order: 0 }], matrixItems: [] }],
    stimulusFiles: [], sequenceSteps: [],
  }],
  design: { id: 'd1', studyId: 'S1', designType: 'NONE', counterbalanceMethod: 'LATIN_SQUARE', targetN: 100, settings: {}, factors: [] },
  ...extra,
})

describe('empreinte du matériel', () => {
  it('sérialisation stable, quel que soit l’ordre des clés', () => {
    expect(canonique({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(canonique({ a: [2, { c: 2, d: 1 }], b: 1 }))
  })
  it('identique si seuls identifiants, horodatages, objectif ou statut changent', () => {
    const a = empreinteEtude(etude())
    const b = empreinteEtude(etude('Q ?', {
      id: 'AUTRE', status: 'DRAFT', name: 'Autre nom', updatedAt: new Date(),
      design: { id: 'd9', designType: 'NONE', counterbalanceMethod: 'LATIN_SQUARE', targetN: 300, settings: { abandonAfterHours: 24 }, factors: [] },
    }))
    expect(b).toBe(a)
  })
  it('change dès qu’un mot du matériel change', () => {
    expect(empreinteEtude(etude('Q modifiée ?'))).not.toBe(empreinteEtude(etude()))
  })
  it('format court lisible', () => {
    expect(empreinteCourte('7b2d41c9e91fa0d3ffff')).toBe('7b2d 41c9 e91f a0d3')
  })
})

// Prisma simulé : sessions, gels, étude, cahier.
function fauxPrisma({ sessions = [], gels = [] } = {}) {
  const cahier = []
  const p = {
    cahier, gels,
    $executeRaw: async () => 1,
    $transaction: async (fn) => fn(p),
    participantSession: {
      findFirst: async () => (sessions.length ? [...sessions].sort((x, y) => x.allocatedAt - y.allocatedAt)[0] : null),
      count: async () => sessions.length,
    },
    studyFreeze: {
      findFirst: async ({ where }) => gels.find((g) => g.studyId === where.studyId && g.createdAt >= where.createdAt.gte) || null,
      create: async ({ data }) => { const g = { id: `g${gels.length + 1}`, createdAt: new Date(), ...data }; gels.push(g); return g },
    },
    study: { findUnique: async () => etude() },
    user: { findUnique: async () => null },
    notebookEntry: { create: async ({ data }) => { cahier.push(data); return data } },
  }
  return p
}

describe('figerSiPremierParticipant', () => {
  it('gèle au premier participant et l’inscrit dans le cahier', async () => {
    const p = fauxPrisma({ sessions: [{ allocatedAt: new Date(Date.now() - 1000) }] })
    const gel = await figerSiPremierParticipant(p, 'S1')
    expect(gel).toMatchObject({ studyId: 'S1', version: 3, priorSessions: 0 })
    expect(gel.fingerprint).toMatch(/^[0-9a-f]{64}$/)
    expect(p.cahier).toHaveLength(1)
    expect(p.cahier[0]).toMatchObject({ kind: 'AUTO', autoEvent: 'GEL', refId: gel.id })
    expect(p.cahier[0].content).toMatch(/^Collecte lancée : premier participant/)
  })
  it('étude déjà en collecte avant la fonctionnalité : gel « en cours de collecte »', async () => {
    const t = Date.now()
    const p = fauxPrisma({ sessions: [1, 2, 3].map((i) => ({ allocatedAt: new Date(t - i * 1000) })) })
    const gel = await figerSiPremierParticipant(p, 'S1')
    expect(gel.priorSessions).toBe(2)
    expect(p.cahier[0].content).toMatch(/^Gel du matériel en cours de collecte \(2 participants/)
  })
  it('pas de second gel pour les participants suivants', async () => {
    const p = fauxPrisma({ sessions: [{ allocatedAt: new Date(Date.now() - 5000) }] })
    await figerSiPremierParticipant(p, 'S1')
    await figerSiPremierParticipant(p, 'S1')
    expect(p.gels).toHaveLength(1)
  })
  it('nouveau gel après une réinitialisation (sessions plus récentes que le dernier gel)', async () => {
    const ancien = { id: 'g0', studyId: 'S1', createdAt: new Date(Date.now() - 3600 * 1000) }
    const p = fauxPrisma({ sessions: [{ allocatedAt: new Date(Date.now() - 1000) }], gels: [ancien] })
    await figerSiPremierParticipant(p, 'S1')
    expect(p.gels).toHaveLength(2)
  })
  it('aucune session : rien ; erreur de base : jamais d’exception', async () => {
    expect(await figerSiPremierParticipant(fauxPrisma(), 'S1')).toBe(null)
    const casse = { participantSession: { findFirst: async () => { throw new Error('db') } } }
    await expect(figerSiPremierParticipant(casse, 'S1')).resolves.toBe(null)
  })
})
