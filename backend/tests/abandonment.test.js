// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du délai d'abandon (lib/abandonment.js) et de son effet sur les quotas
// (allocateParticipant ignore les sessions abandonnées).

import { describe, it, expect } from 'vitest'
import { delaiAbandonHeures, sessionsAbandonnees, marquerAbandons } from '../src/lib/abandonment.js'
import { allocateParticipant } from '../src/lib/counterbalancing.js'

const H = 3600 * 1000
const MAINTENANT = new Date('2026-10-09T12:00:00Z').getTime()
const ilYa = (heures) => new Date(MAINTENANT - heures * H)

describe('delaiAbandonHeures', () => {
  it('sans réglage ou réglage invalide → pas de délai', () => {
    expect(delaiAbandonHeures(null)).toBe(null)
    expect(delaiAbandonHeures({ settings: {} })).toBe(null)
    expect(delaiAbandonHeures({ settings: { abandonAfterHours: null } })).toBe(null)
    expect(delaiAbandonHeures({ settings: { abandonAfterHours: 0 } })).toBe(null)
    expect(delaiAbandonHeures({ settings: { abandonAfterHours: 'abc' } })).toBe(null)
  })
  it('délai positif → nombre d’heures', () => {
    expect(delaiAbandonHeures({ settings: { abandonAfterHours: 24 } })).toBe(24)
    expect(delaiAbandonHeures({ settings: { abandonAfterHours: '6' } })).toBe(6)
  })
})

describe('sessionsAbandonnees (dernière activité)', () => {
  const limite = ilYa(24)
  it('compte la dernière activité, pas le début de la passation', () => {
    const candidates = [
      { id: 'lent', participantId: 'p1', allocatedAt: ilYa(30), startedAt: ilYa(30) },     // a répondu il y a 2 h
      { id: 'parti', participantId: 'p2', allocatedAt: ilYa(30), startedAt: ilYa(30) },    // rien depuis 29 h
      { id: 'jamais', participantId: 'p3', allocatedAt: ilYa(48), startedAt: null },       // aucune activité
    ]
    const activites = { p1: ilYa(2), p2: ilYa(29) }
    expect(sessionsAbandonnees(candidates, activites, limite)).toEqual(['parti', 'jamais'])
  })
  it('une activité exactement à la limite n’est pas un abandon', () => {
    const c = [{ id: 's', participantId: 'p', allocatedAt: ilYa(30), startedAt: null }]
    expect(sessionsAbandonnees(c, { p: limite }, limite)).toEqual([])
  })
})

// Prisma simulé : juste ce que marquerAbandons utilise.
function fauxPrisma({ sessions, visites = [], reponses = [] }) {
  const groupe = (lignes, champ) => {
    const max = {}
    for (const l of lignes) if (!max[l.participantId] || l.date > max[l.participantId]) max[l.participantId] = l.date
    return Object.entries(max).map(([participantId, d]) => ({ participantId, _max: { [champ]: d } }))
  }
  const maj = []
  return {
    maj,
    participantSession: {
      findMany: async ({ where }) => sessions.filter((s) =>
        s.studyId === where.studyId && where.status.in.includes(s.status) && s.allocatedAt < where.allocatedAt.lt),
      updateMany: async ({ where, data }) => {
        let count = 0
        for (const s of sessions) {
          if (where.id.in.includes(s.id) && where.status.in.includes(s.status)) { s.status = data.status; count++; maj.push(s.id) }
        }
        return { count }
      },
    },
    pageVisit: { groupBy: async () => groupe(visites, 'visitedAt') },
    questionResponse: { groupBy: async () => groupe(reponses, 'createdAt') },
    trialResponse: { groupBy: async () => [] },
    externalTaskResponse: { groupBy: async () => [] },
  }
}

describe('marquerAbandons', () => {
  const design = { settings: { abandonAfterHours: 24 } }
  const sessions = () => [
    { id: 'a', studyId: 'S', participantId: 'pa', status: 'IN_PROGRESS', allocatedAt: ilYa(40), startedAt: ilYa(40) },
    { id: 'b', studyId: 'S', participantId: 'pb', status: 'IN_PROGRESS', allocatedAt: ilYa(40), startedAt: ilYa(40) },
    { id: 'c', studyId: 'S', participantId: 'pc', status: 'COMPLETED', allocatedAt: ilYa(40), startedAt: ilYa(40) },
    { id: 'd', studyId: 'S', participantId: 'pd', status: 'IN_PROGRESS', allocatedAt: ilYa(1), startedAt: ilYa(1) },
  ]

  it('sans délai : ne touche à rien', async () => {
    const p = fauxPrisma({ sessions: sessions() })
    expect(await marquerAbandons(p, 'S', { settings: {} }, { force: true, maintenant: MAINTENANT })).toBe(0)
    expect(p.maj).toEqual([])
  })

  it('marque seulement les sessions en cours sans activité depuis le délai', async () => {
    const s = sessions()
    const p = fauxPrisma({ sessions: s, visites: [{ participantId: 'pb', date: ilYa(3) }] })
    expect(await marquerAbandons(p, 'S', design, { force: true, maintenant: MAINTENANT })).toBe(1)
    expect(p.maj).toEqual(['a'])                       // b : activité récente ; c : terminé ; d : récent
    expect(s.find((x) => x.id === 'c').status).toBe('COMPLETED')
  })

  it('au plus une fois par minute et par étude, sauf force', async () => {
    const p = fauxPrisma({ sessions: sessions() })
    expect(await marquerAbandons(p, 'S2', design, { maintenant: MAINTENANT })).toBe(0)        // S2 : aucune session
    const p2 = fauxPrisma({ sessions: sessions().map((x) => ({ ...x, studyId: 'S2' })) })
    expect(await marquerAbandons(p2, 'S2', design, { maintenant: MAINTENANT + 1000 })).toBe(0) // < 1 min : ignoré
    expect(await marquerAbandons(p2, 'S2', design, { maintenant: MAINTENANT + 61 * 1000 })).toBe(2)
  })
})

describe('quotas : les sessions abandonnées libèrent leur place', () => {
  const design = { designType: 'NONE', quotaMode: 'STRICT', targetN: 2, counterbalanceMethod: 'LATIN_SQUARE' }
  it('étude pleine si 2 sessions actives', () => {
    const s = [{ status: 'COMPLETED', conditionAssignments: [] }, { status: 'IN_PROGRESS', conditionAssignments: [] }]
    expect(allocateParticipant(design, [], s).full).toBe(true)
  })
  it('une session abandonnée ou exclue ne compte plus', () => {
    const s = [{ status: 'COMPLETED', conditionAssignments: [] }, { status: 'ABANDONED', conditionAssignments: [] }, { status: 'EXCLUDED', conditionAssignments: [] }]
    expect(allocateParticipant(design, [], s).full).toBeUndefined()
  })
  it('inter-sujet : la place libérée revient à la condition de l’abandon', () => {
    const factors = [{ id: 'F', type: 'BETWEEN', levels: [{ id: 'A' }, { id: 'B' }] }]
    const d = { ...design, designType: 'BETWEEN', targetN: 4 }
    const s = [
      { status: 'COMPLETED', conditionAssignments: [{ factorLevelId: 'A' }] },
      { status: 'COMPLETED', conditionAssignments: [{ factorLevelId: 'A' }] },
      { status: 'COMPLETED', conditionAssignments: [{ factorLevelId: 'B' }] },
      { status: 'ABANDONED', conditionAssignments: [{ factorLevelId: 'B' }] },
    ]
    const r = allocateParticipant(d, factors, s)
    expect(r.full).toBeUndefined()
    expect(r.betweenAssignments).toEqual([{ factorId: 'F', levelId: 'B' }])
  })
})
