// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du cahier de laboratoire (lib/notebook.js).

import { describe, it, expect } from 'vitest'
import {
  validerEntreeManuelle, normaliserParticipants, changementsDesign,
  noterStatut, noterDesign, noterModificationPendantCollecte, FENETRE_MODIFICATION_MS,
} from '../src/lib/notebook.js'

describe('validerEntreeManuelle', () => {
  it('accepte une entrée valide et nettoie le texte', () => {
    const r = validerEntreeManuelle({ kind: 'PASSATION', content: '  TD groupe 2, RAS  ', participantIds: 'P1, P2;P2' })
    expect(r.erreur).toBeUndefined()
    expect(r.entree).toEqual({ kind: 'PASSATION', content: 'TD groupe 2, RAS', participantIds: ['P1', 'P2'], correctsId: null })
  })
  it('refuse un type inconnu, un type AUTO et un texte vide', () => {
    expect(validerEntreeManuelle({ kind: 'AUTRE', content: 'x' }).erreur).toBeTruthy()
    expect(validerEntreeManuelle({ kind: 'AUTO', content: 'x' }).erreur).toBeTruthy()
    expect(validerEntreeManuelle({ kind: 'NOTE', content: '   ' }).erreur).toBeTruthy()
  })
  it('refuse un texte trop long', () => {
    expect(validerEntreeManuelle({ kind: 'NOTE', content: 'a'.repeat(5001) }).erreur).toMatch(/trop long/)
  })
  it('garde la référence de correction', () => {
    expect(validerEntreeManuelle({ kind: 'NOTE', content: 'corr', correctsId: 'abc' }).entree.correctsId).toBe('abc')
  })
})

describe('normaliserParticipants', () => {
  it('dédoublonne, retire les vides, accepte tableau ou texte', () => {
    expect(normaliserParticipants(['a', ' a ', '', 'b'])).toEqual(['a', 'b'])
    expect(normaliserParticipants('x y,z')).toEqual(['x', 'y', 'z'])
    expect(normaliserParticipants(undefined)).toEqual([])
  })
  it('limite à 50 identifiants', () => {
    expect(normaliserParticipants(Array.from({ length: 80 }, (_, i) => `P${i}`))).toHaveLength(50)
  })
})

describe('changementsDesign', () => {
  it('détecte objectif et délai d’abandon', () => {
    expect(changementsDesign({ targetN: 100, settings: {} }, { targetN: 120, settings: { abandonAfterHours: 24 } }))
      .toEqual(['objectif 100 → 120 participants', "délai d'abandon aucun → 24 h"])
  })
  it('rien si identiques', () => {
    expect(changementsDesign({ targetN: 50, settings: { abandonAfterHours: 12 } }, { targetN: 50, settings: { abandonAfterHours: 12 } })).toEqual([])
  })
})

// Prisma simulé : notebookEntry.create / findFirst, user.findUnique.
function fauxPrisma() {
  const entrees = []
  return {
    entrees,
    user: { findUnique: async () => ({ username: 'ddavid' }) },
    notebookEntry: {
      create: async ({ data }) => { const e = { id: `e${entrees.length + 1}`, createdAt: new Date(data.createdAt || Date.now()), ...data }; entrees.push(e); return e },
      findFirst: async ({ where }) => entrees.find((e) => e.studyId === where.studyId && e.autoEvent === where.autoEvent && e.createdAt >= where.createdAt.gte) || null,
    },
  }
}

describe('entrées automatiques', () => {
  it('statut : une entrée si le statut change, aucune sinon', async () => {
    const p = fauxPrisma()
    await noterStatut(p, { studyId: 'S', userId: 'u', avant: 'DRAFT', apres: 'COLLECTING' })
    await noterStatut(p, { studyId: 'S', userId: 'u', avant: 'COLLECTING', apres: 'COLLECTING' })
    expect(p.entrees).toHaveLength(1)
    expect(p.entrees[0]).toMatchObject({ kind: 'AUTO', autoEvent: 'STATUS', content: 'Statut : Brouillon → En collecte.', authorName: 'ddavid' })
  })
  it('design : rien si l’objectif et le délai ne changent pas', async () => {
    const p = fauxPrisma()
    await noterDesign(p, { studyId: 'S', userId: 'u', avant: { targetN: 10, settings: {} }, apres: { targetN: 10, settings: {} } })
    expect(p.entrees).toHaveLength(0)
  })
  it('modification : seulement en collecte, regroupée sur 30 minutes', async () => {
    const p = fauxPrisma()
    const t0 = Date.now()
    await noterModificationPendantCollecte(p, { studyId: 'S', userId: 'u', statut: 'DRAFT', version: 2, maintenant: t0 })
    expect(p.entrees).toHaveLength(0)                                   // brouillon : rien
    await noterModificationPendantCollecte(p, { studyId: 'S', userId: 'u', statut: 'COLLECTING', version: 3, maintenant: t0 })
    await noterModificationPendantCollecte(p, { studyId: 'S', userId: 'u', statut: 'COLLECTING', version: 4, maintenant: t0 + 60 * 1000 })
    expect(p.entrees).toHaveLength(1)                                   // 2e modif dans la fenêtre : regroupée
    expect(p.entrees[0].content).toMatch(/version 3/)
    await noterModificationPendantCollecte(p, { studyId: 'S', userId: 'u', statut: 'COLLECTING', version: 9, maintenant: t0 + FENETRE_MODIFICATION_MS + 1000 })
    expect(p.entrees).toHaveLength(2)                                   // après la fenêtre : nouvelle entrée
  })
  it('une erreur de base ne fait jamais échouer l’action', async () => {
    const p = { user: { findUnique: async () => null }, notebookEntry: { create: async () => { throw new Error('db') }, findFirst: async () => null } }
    await expect(noterStatut(p, { studyId: 'S', avant: 'DRAFT', apres: 'ARCHIVED' })).resolves.toBe(null)
  })
})
