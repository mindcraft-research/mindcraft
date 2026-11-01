// SPDX-License-Identifier: AGPL-3.0-or-later
// Option d'export « Protéger les CSV pour Excel » (?excel=1, décochée par
// défaut) : apostrophe devant une réponse qui commence par = + - @ ; les
// nombres et les exports sans l'option restent inchangés.
// Test d'intégration : backend lancé sur le port 3002 (comme tests/acces.test.js).

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createHmac } from 'crypto'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

if (!process.env.JWT_SECRET) dotenv.config({ quiet: true })

const BASE = 'http://localhost:3002'
const prisma = new PrismaClient()
const NOM = `exportxl${Date.now()}`
const ids = {}
let jeton

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function signer(u) {
  const t = Math.floor(Date.now() / 1000)
  const corps = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: u.id, username: u.username, email: u.email, typ: 'access', iat: t, exp: t + 600 })}`
  return `${corps}.${createHmac('sha256', process.env.JWT_SECRET).update(corps).digest('base64url')}`
}
const csv = async (options = '') => (await fetch(`${BASE}/api/studies/${ids.etude}/export/csv${options}`, { headers: { Authorization: `Bearer ${jeton}` } })).text()

describe('Export CSV : protéger pour Excel', () => {
  beforeAll(async () => {
    const u = await prisma.user.create({ data: { username: NOM, email: `${NOM}@test.com`, password: 'x', emailVerified: true } })
    jeton = signer(u)
    const projet = await prisma.project.create({ data: { name: NOM, ownerId: u.id } })
    const etude = await prisma.study.create({ data: { name: NOM, projectId: projet.id, status: 'COLLECTING' } })
    const bloc = await prisma.block.create({ data: { type: 'QUESTION', order: 0, settings: {}, studyId: etude.id, questions: { create: [
      { code: 'T1', type: 'TEXT', text: 'Texte', order: 0, settings: {} },
      { code: 'N1', type: 'NUMERIC', text: 'Nombre', order: 1, settings: {} },
    ] } } })
    await prisma.participantSession.create({ data: { studyId: etude.id, participantId: `${NOM}p`, status: 'COMPLETED', counterbalanceIndex: 0, blockOrder: [bloc.id] } })
    await prisma.questionResponse.createMany({ data: [
      { participantId: `${NOM}p`, studyId: etude.id, blockId: bloc.id, questionCode: 'T1', value: '=LIEN_HYPERTEXTE("x";"y")' },
      { participantId: `${NOM}p`, studyId: etude.id, blockId: bloc.id, questionCode: 'N1', value: '-3' },
    ] })
    Object.assign(ids, { projet: projet.id, etude: etude.id })
  })
  afterAll(async () => {
    await prisma.study.deleteMany({ where: { projectId: ids.projet } })
    await prisma.project.deleteMany({ where: { name: NOM } })
    await prisma.user.deleteMany({ where: { username: NOM } })
    await prisma.$disconnect()
  })

  it('sans l’option : CSV inchangé', async () => {
    const t = await csv()
    expect(t).toContain('"=LIEN_HYPERTEXTE(""x"";""y"")"')
    expect(t).not.toContain('\'=')
    expect(t).toMatch(/,-3(,|\n|$)/)
  })

  it('avec l’option : apostrophe devant la formule, nombres intacts', async () => {
    const t = await csv('?excel=1')
    expect(t).toContain('"\'=LIEN_HYPERTEXTE(""x"";""y"")"')
    expect(t).toMatch(/,-3(,|\n|$)/)
    expect(t).not.toContain('\'-3')
  })
})
