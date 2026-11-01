// SPDX-License-Identifier: AGPL-3.0-or-later
// Lien d'aperçu (lib/apercu.js) et routes publiques des participants : l'aperçu
// exige la clé de l'étude ; une nouvelle session exige une étude en collecte ;
// réponses, essais et pages exigent une session dans l'étude et un bloc de
// l'étude. Une session déjà commencée peut se terminer après la collecte.
// Test d'intégration : backend lancé sur le port 3002 (comme tests/acces.test.js).

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createHmac } from 'crypto'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

if (!process.env.JWT_SECRET) dotenv.config({ quiet: true })

const BASE = 'http://localhost:3002'
const prisma = new PrismaClient()
const PREFIXE = `apercu${Date.now()}`
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
const appel = async (methode, url, { corps, jeton } = {}) => {
  const res = await fetch(BASE + url, {
    method: methode,
    headers: { ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}), ...(corps ? { 'Content-Type': 'application/json' } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  })
  let data = null
  try { data = await res.json() } catch {}
  return { statut: res.status, data }
}

describe('Lien d’aperçu et routes des participants', () => {
  beforeAll(async () => {
    const proprio = await compte('proprio')
    const lecteur = await compte('lecteur')
    await compte('inconnu')
    const projet = await prisma.project.create({ data: { name: `${PREFIXE}projet`, ownerId: proprio.id, collaborators: { create: [{ userId: lecteur.id, role: 'VIEWER' }] } } })
    const brouillon = await prisma.study.create({ data: { name: `${PREFIXE}brouillon`, projectId: projet.id } })
    const collecte = await prisma.study.create({ data: { name: `${PREFIXE}collecte`, projectId: projet.id, status: 'COLLECTING' } })
    const bloc = await prisma.block.create({ data: { type: 'QUESTION', order: 0, settings: {}, studyId: collecte.id } })
    const blocAutre = await prisma.block.create({ data: { type: 'QUESTION', order: 0, settings: {}, studyId: brouillon.id } })
    Object.assign(ids, { projet: projet.id, brouillon: brouillon.id, collecte: collecte.id, bloc: bloc.id, blocAutre: blocAutre.id })
  })

  afterAll(async () => {
    await prisma.study.deleteMany({ where: { projectId: ids.projet } })
    await prisma.project.deleteMany({ where: { name: { startsWith: PREFIXE } } })
    await prisma.user.deleteMany({ where: { username: { startsWith: PREFIXE } } })
    await prisma.$disconnect()
  })

  it('aperçu : seulement avec la clé de l’étude', async () => {
    const run = (cle) => appel('GET', `/api/run/${ids.brouillon}?preview=${encodeURIComponent(cle)}`)
    expect((await run('1')).statut).toBe(403)
    expect((await appel('GET', `/api/studies/${ids.brouillon}/preview-key`, { jeton: J.inconnu })).statut).toBe(404)

    const { statut, data } = await appel('GET', `/api/studies/${ids.brouillon}/preview-key`, { jeton: J.lecteur })
    expect(statut).toBe(200)
    expect(data.key).toMatch(/^[\w-]{24}$/)
    // Même clé à la lecture suivante.
    expect((await appel('GET', `/api/studies/${ids.brouillon}/preview-key`, { jeton: J.proprio })).data.key).toBe(data.key)

    const ok = await run(data.key)
    expect(ok.statut).toBe(200)
    expect(ok.data.study.name).toBe(`${PREFIXE}brouillon`)
    expect(JSON.stringify(ok.data)).not.toContain(data.key)
    // La clé d'une autre étude ne marche pas.
    const autreCle = (await appel('GET', `/api/studies/${ids.collecte}/preview-key`, { jeton: J.proprio })).data.key
    expect((await run(autreCle)).statut).toBe(403)
    // Sans aperçu, un brouillon reste fermé.
    expect((await appel('GET', `/api/run/${ids.brouillon}`)).statut).toBe(403)
  })

  it('changer la clé : propriétaire ou éditeur ; l’ancien lien ne marche plus', async () => {
    const ancienne = (await appel('GET', `/api/studies/${ids.brouillon}/preview-key`, { jeton: J.proprio })).data.key
    expect((await appel('POST', `/api/studies/${ids.brouillon}/preview-key`, { jeton: J.lecteur })).statut).toBe(403)
    const { statut, data } = await appel('POST', `/api/studies/${ids.brouillon}/preview-key`, { jeton: J.proprio })
    expect(statut).toBe(200)
    expect(data.key).not.toBe(ancienne)
    expect((await appel('GET', `/api/run/${ids.brouillon}?preview=${ancienne}`)).statut).toBe(403)
    expect((await appel('GET', `/api/run/${ids.brouillon}?preview=${data.key}`)).statut).toBe(200)
  })

  it('nouvelle session : seulement pendant la collecte', async () => {
    expect((await appel('POST', `/api/studies/${ids.brouillon}/sessions/allocate`, { corps: { participantId: `${PREFIXE}p0` } })).statut).toBe(403)
    expect((await appel('POST', `/api/studies/${ids.collecte}/sessions/allocate`, { corps: { participantId: `${PREFIXE}p1` } })).statut).toBe(201)
  })

  it('réponses : session dans l’étude et bloc de l’étude', async () => {
    const reponses = (participantId, blockId) => appel('POST', `/api/run/${ids.collecte}/responses/questions`, {
      corps: { participantId, blockId, responses: [{ questionCode: 'Q1', value: 'x' }] },
    })
    expect((await reponses(`${PREFIXE}inconnu`, ids.bloc)).statut).toBe(403)
    expect((await reponses(`${PREFIXE}p1`, ids.blocAutre)).statut).toBe(403)
    expect((await reponses(`${PREFIXE}p1`, ids.bloc)).statut).toBe(201)

    const essais = (participantId) => appel('POST', '/api/stimulus/responses', {
      corps: { participantId, studyId: ids.collecte, blockId: ids.bloc, trials: [{ rtMs: 300 }] },
    })
    expect((await essais(`${PREFIXE}inconnu`)).statut).toBe(403)
    expect((await essais(`${PREFIXE}p1`)).statut).toBe(201)

    const page = (participantId) => appel('POST', `/api/run/${ids.collecte}/page-visit`, { corps: { participantId, blockId: ids.bloc } })
    expect((await page(`${PREFIXE}inconnu`)).statut).toBe(403)
    expect((await page(`${PREFIXE}p1`)).statut).toBe(201)

    const tache = (participantId) => appel('POST', `/api/run/${ids.collecte}/responses/external-task`, { corps: { participantId, blockId: ids.bloc, data: { ok: 1 } } })
    expect((await tache(`${PREFIXE}inconnu`)).statut).toBe(403)
    expect((await tache(`${PREFIXE}p1`)).statut).toBe(201)

    expect(await prisma.questionResponse.count({ where: { studyId: ids.collecte, participantId: { startsWith: `${PREFIXE}inconnu` } } })).toBe(0)
  })

  it('une session commencée se termine même si la collecte est fermée', async () => {
    await prisma.study.update({ where: { id: ids.collecte }, data: { status: 'ARCHIVED' } })
    const r = await appel('POST', `/api/run/${ids.collecte}/responses/questions`, {
      corps: { participantId: `${PREFIXE}p1`, blockId: ids.bloc, responses: [{ questionCode: 'Q2', value: 'y' }] },
    })
    expect(r.statut).toBe(201)
    // La même personne retrouve sa session ; une nouvelle n'en obtient pas.
    expect((await appel('POST', `/api/studies/${ids.collecte}/sessions/allocate`, { corps: { participantId: `${PREFIXE}p1` } })).statut).toBe(200)
    expect((await appel('POST', `/api/studies/${ids.collecte}/sessions/allocate`, { corps: { participantId: `${PREFIXE}p2` } })).statut).toBe(403)
  })

  it('aperçu : rien n’est enregistré', async () => {
    const r = await appel('POST', `/api/run/${ids.collecte}/responses/questions?preview=1`, {
      corps: { participantId: `${PREFIXE}apercu`, blockId: ids.bloc, responses: [{ questionCode: 'Q1', value: 'x' }] },
    })
    expect(r.data).toMatchObject({ stored: false, preview: true })
  })
})
