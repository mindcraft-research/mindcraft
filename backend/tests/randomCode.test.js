// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du code aléatoire garanti unique (lib/randomCode.js).

import { describe, it, expect } from 'vitest'
import { tirer, combinaisons, attribuerCode } from '../src/lib/randomCode.js'

// Prisma simulé : unicité (étude, question, code) et (session, question)
// comme la base.
function fauxPrisma({ format = 'C##', anciens = [] } = {}) {
  const codes = []
  const conflit = () => Object.assign(new Error('unique'), { code: 'P2002' })
  return {
    codes,
    participantSession: { findUnique: async ({ where }) => (where.studyId_participantId.participantId.startsWith('P') ? { id: `s-${where.studyId_participantId.participantId}` } : null) },
    question: { findFirst: async ({ where }) => (where.code === 'CODE' ? { settings: { mask: format } } : null) },
    questionResponse: {
      findFirst: async ({ where }) => (anciens.includes(where.value.equals) ? { id: 'r' } : null),
      findMany: async () => anciens.map((value) => ({ value })),
    },
    randomCode: {
      findMany: async ({ where }) => codes.filter((c) => c.studyId === where.studyId && c.questionCode === where.questionCode),
      findUnique: async ({ where }) => codes.find((c) => c.sessionId === where.sessionId_questionCode.sessionId && c.questionCode === where.sessionId_questionCode.questionCode) || null,
      create: async ({ data }) => {
        if (codes.some((c) => c.studyId === data.studyId && c.questionCode === data.questionCode && c.code === data.code)) throw conflit()
        if (codes.some((c) => c.sessionId === data.sessionId && c.questionCode === data.questionCode)) throw conflit()
        codes.push(data)
        return data
      },
    },
  }
}

describe('format', () => {
  it('chaque « # » devient un chiffre, le reste est conservé', () => {
    expect(tirer('F##Y####')).toMatch(/^F\d{2}Y\d{4}$/)
    expect(combinaisons('F##Y####')).toBe(1e6)
    expect(combinaisons('ABC')).toBe(1)
  })
})

describe('attribuerCode', () => {
  it('100 participants, 100 codes possibles : tous différents', async () => {
    const p = fauxPrisma({ format: 'C##' })
    const res = []
    for (let i = 0; i < 100; i++) res.push((await attribuerCode(p, { studyId: 'S', participantId: `P${i}`, questionCode: 'CODE' })).code)
    expect(new Set(res).size).toBe(100)
    expect(res.every((c) => /^C\d{2}$/.test(c))).toBe(true)
  })
  it('format épuisé : erreur explicite, aucun doublon', async () => {
    const p = fauxPrisma({ format: '#' })
    const res = []
    for (let i = 0; i < 12; i++) res.push(await attribuerCode(p, { studyId: 'S', participantId: `P${i}`, questionCode: 'CODE' }))
    expect(res.filter((r) => r.code).length).toBe(10)
    expect(res.filter((r) => r.statut === 409)).toHaveLength(2)
    expect(res.find((r) => r.erreur).erreur).toMatch(/allongez-le/)
  })
  it('format long (tirage au hasard) : codes différents', async () => {
    const p = fauxPrisma({ format: 'MC-##########' })
    const res = []
    for (let i = 0; i < 200; i++) res.push((await attribuerCode(p, { studyId: 'S', participantId: `P${i}`, questionCode: 'CODE' })).code)
    expect(new Set(res).size).toBe(200)
    expect(res.every((c) => /^MC-\d{10}$/.test(c))).toBe(true)
  })
  it('page rechargée : le même code', async () => {
    const p = fauxPrisma({ format: '######' })
    const a = await attribuerCode(p, { studyId: 'S', participantId: 'P1', questionCode: 'CODE' })
    const b = await attribuerCode(p, { studyId: 'S', participantId: 'P1', questionCode: 'CODE' })
    expect(b.code).toBe(a.code)
    expect(p.codes).toHaveLength(1)
  })
  it('évite les codes déjà présents dans les réponses enregistrées avant la garantie', async () => {
    const anciens = ['0', '1', '2', '3', '4', '5', '6', '7', '8']
    const r = await attribuerCode(fauxPrisma({ format: '#', anciens }), { studyId: 'S', participantId: 'P1', questionCode: 'CODE' })
    expect(r.code).toBe('9')
  })
  it('refus : session ou question inconnue, format sans « # »', async () => {
    expect((await attribuerCode(fauxPrisma(), { studyId: 'S', participantId: 'X1', questionCode: 'CODE' })).statut).toBe(404)
    expect((await attribuerCode(fauxPrisma(), { studyId: 'S', participantId: 'P1', questionCode: 'AUTRE' })).statut).toBe(404)
    expect((await attribuerCode(fauxPrisma({ format: 'ABC' }), { studyId: 'S', participantId: 'P1', questionCode: 'CODE' })).statut).toBe(409)
    expect((await attribuerCode(fauxPrisma(), { studyId: 'S', participantId: '', questionCode: 'CODE' })).statut).toBe(400)
  })
})
