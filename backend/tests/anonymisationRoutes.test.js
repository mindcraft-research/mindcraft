// SPDX-License-Identifier: AGPL-3.0-or-later
// Anonymisation des réponses libres, de la route à l'export : droits, masques
// appliqués au CSV, export d'origine réservé au propriétaire, trace du cahier.
// Test d'intégration : backend lancé sur le port 3002 avec une base de test
// (comme tests/acces.test.js, en CI).

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createHmac } from 'crypto'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

if (!process.env.JWT_SECRET) dotenv.config({ quiet: true })

const BASE = 'http://localhost:3002'
const prisma = new PrismaClient()
const PREFIXE = `anonym${Date.now()}`
const J = {}
const ids = {}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function jeton(u) {
  const maintenant = Math.floor(Date.now() / 1000)
  const corps = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: u.id, username: u.username, email: u.email, iat: maintenant, exp: maintenant + 3600 })}`
  return `${corps}.${createHmac('sha256', process.env.JWT_SECRET).update(corps).digest('base64url')}`
}
async function compte(nom) {
  const username = `${PREFIXE}${nom}`
  const u = await prisma.user.create({ data: { username, email: `${username}@test.com`, password: 'x', emailVerified: true } })
  J[nom] = jeton(u)
  return u
}
async function appel(j, methode, url, corps) {
  const r = await fetch(BASE + url, {
    method: methode,
    headers: { Authorization: `Bearer ${j}`, ...(corps !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: corps !== undefined ? JSON.stringify(corps) : undefined,
  })
  const texte = await r.text()
  let json = null
  try { json = JSON.parse(texte) } catch { /* CSV */ }
  return { status: r.status, texte, json }
}
const E = () => `/api/studies/${ids.etude}`

describe('Anonymisation : routes et exports', () => {
  beforeAll(async () => {
    const proprio = await compte('proprio')
    const editeur = await compte('editeur')
    const lecteur = await compte('lecteur')
    await compte('inconnu')
    const projet = await prisma.project.create({ data: { name: PREFIXE, ownerId: proprio.id, collaborators: { create: [{ userId: editeur.id, role: 'EDITOR' }, { userId: lecteur.id, role: 'VIEWER' }] } } })
    const etude = await prisma.study.create({ data: { name: PREFIXE, projectId: projet.id, status: 'COLLECTING' } })
    const bloc = await prisma.block.create({ data: { type: 'QUESTION', order: 0, settings: {}, studyId: etude.id, questions: { create: [{ code: 'LIBRE', type: 'TEXT', text: 'Racontez', order: 0, settings: {} }] } } })
    Object.assign(ids, { projet: projet.id, etude: etude.id, bloc: bloc.id, proprio: proprio.id })
    const textes = { p1: 'Mon chef Paul Durand est là.', p2: 'Je vois paul durand souvent.', p3: 'Rien à signaler.' }
    for (const [participantId, value] of Object.entries(textes)) {
      await prisma.participantSession.create({ data: { participantId, studyId: etude.id, counterbalanceIndex: 0, status: 'COMPLETED' } })
      const r = await prisma.questionResponse.create({ data: { participantId, studyId: etude.id, blockId: bloc.id, questionCode: 'LIBRE', value } })
      ids[participantId] = r.id
    }
  })

  afterAll(async () => {
    await prisma.masquage.deleteMany({ where: { studyId: ids.etude } })
    await prisma.questionResponse.deleteMany({ where: { studyId: ids.etude } })
    await prisma.project.deleteMany({ where: { name: PREFIXE } })
    await prisma.user.deleteMany({ where: { username: { startsWith: PREFIXE } } })
    await prisma.$disconnect()
  })

  it('réserve la page au propriétaire et aux éditeurs', async () => {
    expect((await appel(J.proprio, 'GET', `${E()}/anonymisation`)).status).toBe(200)
    expect((await appel(J.editeur, 'GET', `${E()}/anonymisation`)).status).toBe(200)
    expect((await appel(J.lecteur, 'GET', `${E()}/anonymisation`)).status).toBe(403)
    expect((await appel(J.inconnu, 'GET', `${E()}/anonymisation`)).status).toBe(404)
  })

  it('refuse un masque mal formé avec une erreur 400, pas 500', async () => {
    const url = `${E()}/anonymisation/${ids.p1}`
    expect((await appel(J.proprio, 'PUT', url, { masques: [null] })).status).toBe(400)
    expect((await appel(J.proprio, 'PUT', url, { masques: [{ texte: 'Inconnu', etiquette: '[NOM]' }] })).status).toBe(400)
    expect((await appel(J.proprio, 'PUT', url, { masques: [{ texte: 'Paul', etiquette: '<b>' }] })).status).toBe(400)
  })

  it('« Masquer partout » couvre aussi les variantes de casse dans le CSV', async () => {
    const r = await appel(J.proprio, 'POST', `${E()}/anonymisation/partout`, { texte: 'Paul Durand', etiquette: '[NOM]' })
    expect(r.json.reponses).toBe(2)
    const csv = (await appel(J.proprio, 'GET', `${E()}/export/csv`)).texte
    expect(csv).toContain('Mon chef [NOM] est là.')
    expect(csv).toContain('Je vois [NOM] souvent.')
    expect(csv.toLowerCase()).not.toContain('paul durand')
  })

  it('l’export d’origine est réservé au propriétaire et noté au cahier', async () => {
    expect((await appel(J.editeur, 'GET', `${E()}/export/csv?brut=1`)).status).toBe(403)
    const brut = await appel(J.proprio, 'GET', `${E()}/export/csv?brut=1`)
    expect(brut.texte).toContain('Paul Durand')
    expect(await prisma.notebookEntry.count({ where: { studyId: ids.etude, autoEvent: 'EXPORT_NON_MASQUE' } })).toBe(1)
  })

  it('le cahier ne prétend pas que les réponses ont été relues et ne cite aucun passage', async () => {
    await prisma.participantSession.create({ data: { participantId: 'p4', studyId: ids.etude, counterbalanceIndex: 0, status: 'COMPLETED' } })
    await prisma.questionResponse.create({ data: { participantId: 'p4', studyId: ids.etude, blockId: ids.bloc, questionCode: 'LIBRE', value: 'Voici Sophie Bernard.' } })
    const r = await appel(J.proprio, 'POST', `${E()}/anonymisation/valider`)
    expect(r.json.restantes).toBe(1)
    const { content } = await prisma.notebookEntry.findFirst({ where: { studyId: ids.etude, autoEvent: 'ANONYMISATION' } })
    expect(content).not.toMatch(/relue/)
    expect(content).toContain('1 réponse avec un passage signalé non masqué')
    expect(content).toContain('Collecte encore en cours')
    expect(content).not.toContain('Durand')
    expect(content).not.toContain('Sophie')
  })
})
