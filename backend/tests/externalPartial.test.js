// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de l'enregistrement en cours de tâche externe (lib/externalPartial.js).

import { describe, it, expect } from 'vitest'
import { fusionnerMarqueurs, enregistrerPartiel, enregistrerFinal } from '../src/lib/externalPartial.js'

const mk = (n, base = 0) => Array.from({ length: n }, (_, k) => ({ t: (base + k) * 10, at: '2026-10-26T10:00:00Z', marker: `M${base + k}`, data: { trial: base + k } }))

describe('fusionnerMarqueurs', () => {
  it('ajoute à la suite, avec index et tentative', () => {
    const a = fusionnerMarqueurs(null, { attempt: 'A', from: 0, nouveaux: mk(2) })
    const b = fusionnerMarqueurs(a, { attempt: 'A', from: 2, nouveaux: mk(2, 2) })
    expect(b.map((m) => m.marker)).toEqual(['M0', 'M1', 'M2', 'M3'])
    expect(b.map((m) => m.i)).toEqual([0, 1, 2, 3])
    expect(b.every((m) => m.a === 'A')).toBe(true)
  })
  it('un renvoi ou un chevauchement ne duplique rien', () => {
    const a = fusionnerMarqueurs(null, { attempt: 'A', from: 0, nouveaux: mk(3) })
    const b = fusionnerMarqueurs(a, { attempt: 'A', from: 1, nouveaux: mk(4, 1) })
    expect(b.map((m) => m.marker)).toEqual(['M0', 'M1', 'M2', 'M3', 'M4'])
  })
  it('une nouvelle tentative (page rechargée) garde la précédente', () => {
    const a = fusionnerMarqueurs(null, { attempt: 'A', from: 0, nouveaux: mk(2) })
    const b = fusionnerMarqueurs(a, { attempt: 'B', from: 0, nouveaux: mk(1, 10) })
    expect(b.map((m) => `${m.a}:${m.marker}`)).toEqual(['A:M0', 'A:M1', 'B:M10'])
  })
  it('nettoie les entrées (données non objet, marqueur tronqué)', () => {
    const [m] = fusionnerMarqueurs([], { attempt: 'A', from: 0, nouveaux: [{ t: '12.6', marker: 'X'.repeat(300), data: [1, 2] }] })
    expect(m.t).toBe(13)
    expect(m.marker).toHaveLength(200)
    expect(m.data).toBe(null)
  })
})

// Faux Prisma : une table externalTaskResponse en mémoire.
function fauxPrisma() {
  const lignes = []
  let n = 0
  const match = (l, where) => Object.entries(where).every(([k, v]) => l[k] === v)
  return {
    lignes,
    externalTaskResponse: {
      findFirst: async ({ where }) => [...lignes].reverse().find((l) => match(l, where)) || null,
      create: async ({ data }) => { const l = { id: `r${++n}`, partial: false, markers: null, createdAt: new Date(Date.now() + n), ...data }; lignes.push(l); return l },
      update: async ({ where, data }) => { const l = lignes.find((x) => x.id === where.id); Object.assign(l, data); return l },
    },
  }
}

const base = { participantId: 'p1', blockId: 'b1', attempt: 'A' }

describe('enregistrerPartiel / enregistrerFinal', () => {
  it('tâche interrompue : une ligne partielle avec marqueurs et résultats partiels', async () => {
    const prisma = fauxPrisma()
    await enregistrerPartiel(prisma, 's1', { ...base, from: 0, markers: mk(2) })
    await enregistrerPartiel(prisma, 's1', { ...base, from: 2, markers: mk(1, 2), results: [{ trial: 1 }] })
    expect(prisma.lignes).toHaveLength(1)
    expect(prisma.lignes[0].partial).toBe(true)
    expect(prisma.lignes[0].markers).toHaveLength(3)
    expect(prisma.lignes[0].data).toEqual([{ trial: 1 }])
  })

  it('fin de tâche : la ligne partielle devient définitive, marqueurs gardés', async () => {
    const prisma = fauxPrisma()
    await enregistrerPartiel(prisma, 's1', { ...base, from: 0, markers: mk(2) })
    await enregistrerFinal(prisma, 's1', { participantId: 'p1', blockId: 'b1', data: [{ trial: 1 }, { trial: 2 }] })
    expect(prisma.lignes).toHaveLength(1)
    expect(prisma.lignes[0]).toMatchObject({ partial: false, data: [{ trial: 1 }, { trial: 2 }] })
    expect(prisma.lignes[0].markers).toHaveLength(2)
  })

  it('sans enregistrement partiel (tâche sans marqueurs) : création comme avant', async () => {
    const prisma = fauxPrisma()
    await enregistrerFinal(prisma, 's1', { participantId: 'p1', blockId: 'b1', data: [{ trial: 1 }] })
    expect(prisma.lignes).toHaveLength(1)
    expect(prisma.lignes[0]).toMatchObject({ partial: false, data: [{ trial: 1 }], markers: null })
  })

  it('des résultats partiels tardifs ne remplacent pas les résultats définitifs', async () => {
    const prisma = fauxPrisma()
    await enregistrerFinal(prisma, 's1', { participantId: 'p1', blockId: 'b1', data: [{ trial: 1 }, { trial: 2 }] })
    await enregistrerPartiel(prisma, 's1', { ...base, from: 0, markers: mk(1), results: [{ trial: 1 }] })
    expect(prisma.lignes).toHaveLength(1)
    expect(prisma.lignes[0].data).toHaveLength(2)
    expect(prisma.lignes[0].partial).toBe(false)
    expect(prisma.lignes[0].markers).toHaveLength(1)
  })

  it('fin sans résultats (bouton) : la ligne perd sa marque partielle', async () => {
    const prisma = fauxPrisma()
    await enregistrerPartiel(prisma, 's1', { ...base, from: 0, markers: mk(1) })
    await enregistrerPartiel(prisma, 's1', { ...base, from: 1, markers: [], complete: true })
    expect(prisma.lignes[0].partial).toBe(false)
  })

  it('rien à enregistrer : aucune ligne créée', async () => {
    const prisma = fauxPrisma()
    const r = await enregistrerPartiel(prisma, 's1', { ...base, from: 0, markers: [], complete: true })
    expect(r.changed).toBe(false)
    expect(prisma.lignes).toHaveLength(0)
  })
})
