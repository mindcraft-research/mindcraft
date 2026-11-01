// SPDX-License-Identifier: AGPL-3.0-or-later
// Suppression des données des participants (lib/donneesParticipants.js) : un
// seul participant (à sa demande), réinitialisation, suppression d'une étude,
// d'un projet ou d'un compte. Réponses, essais, tâches et temps par page n'ont
// pas de lien en cascade : ils doivent partir aussi.
// Test d'intégration : backend lancé sur le port 3002 (comme tests/acces.test.js).

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createHmac } from 'crypto'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

if (!process.env.JWT_SECRET) dotenv.config({ quiet: true })

const BASE = 'http://localhost:3002'
const prisma = new PrismaClient()
const NOM = `suppr${Date.now()}`
const MDP = 'Suppr-Test-2026'
const J = {}
let proprio

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function signer(u) {
  const t = Math.floor(Date.now() / 1000)
  const corps = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: u.id, username: u.username, email: u.email, typ: 'access', iat: t, exp: t + 600 })}`
  return `${corps}.${createHmac('sha256', process.env.JWT_SECRET).update(corps).digest('base64url')}`
}
async function compte(nom, mdp = 'x') {
  const u = await prisma.user.create({ data: { username: `${NOM}${nom}`, email: `${NOM}${nom}@test.com`, password: mdp, emailVerified: true } })
  J[nom] = signer(u)
  return u
}
const appel = async (methode, url, jeton, corps) => (await fetch(BASE + url, {
  method: methode,
  headers: { Authorization: `Bearer ${jeton}`, ...(corps ? { 'Content-Type': 'application/json' } : {}) },
  body: corps ? JSON.stringify(corps) : undefined,
})).status

// Une étude avec deux participants, chacun avec des données dans chaque table.
async function etudeAvecDonnees(projectId, participants = ['p1', 'p2']) {
  const etude = await prisma.study.create({ data: { name: `${NOM}etude`, projectId, status: 'COLLECTING' } })
  const bloc = await prisma.block.create({ data: { type: 'QUESTION', order: 0, settings: {}, studyId: etude.id } })
  for (const p of participants) {
    const participantId = `${NOM}${p}`
    const session = await prisma.participantSession.create({ data: { studyId: etude.id, participantId, counterbalanceIndex: 0 } })
    const base = { participantId, studyId: etude.id, blockId: bloc.id }
    await prisma.questionResponse.create({ data: { ...base, questionCode: 'Q1', value: 'x' } })
    await prisma.trialResponse.create({ data: { ...base, trialIndex: 0 } })
    await prisma.externalTaskResponse.create({ data: { ...base, data: [] } })
    await prisma.pageVisit.create({ data: base })
    await prisma.randomCode.create({ data: { studyId: etude.id, questionCode: 'C', code: `${p}-${Date.now()}`, sessionId: session.id } })
  }
  return etude.id
}
const lignes = async (studyId, participantId) => {
  const where = { studyId, ...(participantId ? { participantId: `${NOM}${participantId}` } : {}) }
  const n = await Promise.all([
    prisma.questionResponse.count({ where }), prisma.trialResponse.count({ where }),
    prisma.externalTaskResponse.count({ where }), prisma.pageVisit.count({ where }),
    prisma.participantSession.count({ where }), prisma.randomCode.count({ where: { studyId, ...(participantId ? { session: { participantId: `${NOM}${participantId}` } } : {}) } }),
  ])
  return n.reduce((a, b) => a + b, 0)
}

describe('Suppression des données des participants', () => {
  let projet
  beforeAll(async () => {
    proprio = await compte('proprio')
    const editeur = await compte('editeur')
    projet = await prisma.project.create({ data: { name: `${NOM}projet`, ownerId: proprio.id, collaborators: { create: [{ userId: editeur.id, role: 'EDITOR' }] } } })
  })
  afterAll(async () => {
    await prisma.project.deleteMany({ where: { name: { startsWith: NOM } } })
    await prisma.user.deleteMany({ where: { username: { startsWith: NOM } } })
    await prisma.$disconnect()
  })

  it('un seul participant : propriétaire seulement, les autres restent', async () => {
    const id = await etudeAvecDonnees(projet.id)
    const url = (p) => `/api/studies/${id}/participants/${encodeURIComponent(`${NOM}${p}`)}`
    expect(await appel('DELETE', url('p1'), J.editeur)).toBe(403)
    expect(await appel('DELETE', url('p1'), J.proprio)).toBe(200)
    expect(await lignes(id, 'p1')).toBe(0)
    expect(await lignes(id, 'p2')).toBe(6)
    expect(await appel('DELETE', url('inconnu'), J.proprio)).toBe(404)
    const note = await prisma.notebookEntry.findFirst({ where: { studyId: id, autoEvent: 'SUPPRESSION_PARTICIPANT' } })
    expect(note).toBeTruthy()
    expect(note.content).not.toContain(`${NOM}p1`)
  })

  it('réinitialiser : toutes les données partent, pas seulement les sessions', async () => {
    const id = await etudeAvecDonnees(projet.id)
    expect(await appel('DELETE', `/api/studies/${id}/sessions`, J.proprio)).toBe(200)
    expect(await lignes(id)).toBe(0)
  })

  it('supprimer une étude ou un projet efface les données des participants', async () => {
    const id = await etudeAvecDonnees(projet.id)
    expect(await appel('DELETE', `/api/studies/${id}`, J.proprio)).toBe(200)
    expect(await lignes(id)).toBe(0)

    const autre = await prisma.project.create({ data: { name: `${NOM}autre`, ownerId: proprio.id } })
    const id2 = await etudeAvecDonnees(autre.id)
    expect(await appel('DELETE', `/api/projects/${autre.id}`, J.proprio)).toBe(200)
    expect(await lignes(id2)).toBe(0)
  })

  it('supprimer son compte efface les données des participants de ses études', async () => {
    const u = await compte('depart', await bcrypt.hash(MDP, 4))
    const p = await prisma.project.create({ data: { name: `${NOM}depart`, ownerId: u.id } })
    const id = await etudeAvecDonnees(p.id)
    expect(await appel('POST', '/api/auth/delete-account', J.depart, { password: MDP })).toBe(200)
    expect(await lignes(id)).toBe(0)
  })
})
