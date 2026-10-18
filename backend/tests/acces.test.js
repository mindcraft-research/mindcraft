// SPDX-License-Identifier: AGPL-3.0-or-later
// Contrôle d'accès aux études (lib/acces.js) : un inconnu ne peut ni lire ni
// modifier l'étude d'un autre ; un LECTEUR lit sans modifier ; un ÉDITEUR
// modifie sans pouvoir faire ce qui est réservé au propriétaire ; un bloc
// d'une autre étude ne peut pas être visé par l'adresse d'une étude.
// Test d'intégration : backend lancé sur le port 3002 avec une base de test
// (comme tests/auth.test.js, en CI).

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createHmac } from 'crypto'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Clé du backend : variable d'environnement (CI) ou backend/.env (en local).
if (!process.env.JWT_SECRET) dotenv.config({ quiet: true })

const BASE = 'http://localhost:3002'
const prisma = new PrismaClient()
const PREFIXE = `acces${Date.now()}`

const J = {}
const ids = {}

// Jeton d'accès signé avec la clé du backend (HS256), comme à la connexion.
// La route de connexion n'est pas utilisée : sa limite (30 essais par quart
// d'heure) est volontairement épuisée par tests/auth.test.js.
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

const statut = async (jeton, methode, url, corps) => (await fetch(BASE + url, {
  method: methode,
  headers: { Authorization: `Bearer ${jeton}`, ...(corps ? { 'Content-Type': 'application/json' } : {}) },
  body: corps ? JSON.stringify(corps) : undefined,
})).status

describe('Contrôle d’accès aux études', () => {
  beforeAll(async () => {
    const proprio = await compte('proprio')
    const editeur = await compte('editeur')
    const lecteur = await compte('lecteur')
    await compte('inconnu')
    const projet = await prisma.project.create({ data: { name: `${PREFIXE}projet`, ownerId: proprio.id, collaborators: { create: [{ userId: editeur.id, role: 'EDITOR' }, { userId: lecteur.id, role: 'VIEWER' }] } } })
    const autre = await prisma.project.create({ data: { name: `${PREFIXE}autre`, ownerId: proprio.id } })
    const etude = await prisma.study.create({ data: { name: `${PREFIXE}etude`, projectId: projet.id } })
    const autreEtude = await prisma.study.create({ data: { name: `${PREFIXE}autre-etude`, projectId: autre.id } })
    const bloc = await prisma.block.create({ data: { type: 'QUESTION', order: 0, settings: {}, studyId: etude.id, questions: { create: [{ code: 'Q1', type: 'RADIO', text: 'Q', order: 0, settings: {} }] } }, include: { questions: true } })
    const blocAutre = await prisma.block.create({ data: { type: 'QUESTION', order: 0, settings: {}, studyId: autreEtude.id } })
    const design = await prisma.experimentalDesign.create({ data: { studyId: etude.id, designType: 'BETWEEN', targetN: 10, settings: {}, factors: { create: [{ name: 'F', type: 'BETWEEN', order: 0, levels: { create: [{ name: 'A', code: 'A', order: 0, blockIds: [] }] } }] } }, include: { factors: { include: { levels: true } } } })
    Object.assign(ids, { projet: projet.id, autre: autre.id, etude: etude.id, bloc: bloc.id, question: bloc.questions[0].id, blocAutre: blocAutre.id, facteur: design.factors[0].id, niveau: design.factors[0].levels[0].id })
  })

  afterAll(async () => {
    await prisma.study.deleteMany({ where: { projectId: { in: [ids.projet, ids.autre].filter(Boolean) } } })
    await prisma.project.deleteMany({ where: { name: { startsWith: PREFIXE } } })
    await prisma.user.deleteMany({ where: { username: { startsWith: PREFIXE } } })
    await prisma.$disconnect()
  })

  const E = () => `/api/studies/${ids.etude}`

  it('un inconnu ne voit ni ne modifie rien (404)', async () => {
    expect(await statut(J.inconnu, 'GET', E())).toBe(404)
    expect(await statut(J.inconnu, 'GET', `${E()}/design`)).toBe(404)
    expect(await statut(J.inconnu, 'GET', `${E()}/sessions`)).toBe(404)
    expect(await statut(J.inconnu, 'PUT', `${E()}/design`, { targetN: 1 })).toBe(404)
    expect(await statut(J.inconnu, 'DELETE', `${E()}/design/factors/${ids.facteur}/levels/${ids.niveau}`)).toBe(404)
    expect(await statut(J.inconnu, 'DELETE', `${E()}/blocks/${ids.bloc}`)).toBe(404)
    expect(await statut(J.inconnu, 'PUT', `${E()}/blocks/reorder`, { order: [ids.bloc] })).toBe(404)
    expect(await statut(J.inconnu, 'PUT', `${E()}/blocks/${ids.bloc}/questions/${ids.question}`, { text: 'x' })).toBe(404)
    expect(await statut(J.inconnu, 'PATCH', `${E()}/status`, { status: 'ARCHIVED' })).toBe(404)
    expect(await statut(J.inconnu, 'POST', '/api/studies', { projectId: ids.projet, name: 'x' })).toBe(404)
    expect(await statut(J.inconnu, 'GET', `/api/stimulus/blocks/${ids.bloc}/files`)).toBe(404)
    expect(await prisma.block.findUnique({ where: { id: ids.bloc } })).not.toBeNull()
  })

  it('un lecteur lit mais ne modifie pas (403)', async () => {
    expect(await statut(J.lecteur, 'GET', E())).toBe(200)
    expect(await statut(J.lecteur, 'GET', `${E()}/design`)).toBe(200)
    expect(await statut(J.lecteur, 'GET', `/api/stimulus/blocks/${ids.bloc}/files`)).toBe(200)
    expect(await statut(J.lecteur, 'PATCH', E(), { metadata: {} })).toBe(403)
    expect(await statut(J.lecteur, 'PATCH', `${E()}/status`, { status: 'ARCHIVED' })).toBe(403)
    expect(await statut(J.lecteur, 'POST', `${E()}/blocks`, { type: 'QUESTION' })).toBe(403)
    expect(await statut(J.lecteur, 'DELETE', `${E()}/blocks/${ids.bloc}`)).toBe(403)
    expect(await statut(J.lecteur, 'PUT', `${E()}/design`, { targetN: 1 })).toBe(403)
    expect(await statut(J.lecteur, 'PUT', `/api/stimulus/blocks/${ids.bloc}/sequence`, { steps: [] })).toBe(403)
    expect(await statut(J.lecteur, 'POST', '/api/studies', { projectId: ids.projet, name: 'x' })).toBe(403)
  })

  it('un éditeur modifie, sans les actions réservées au propriétaire', async () => {
    expect(await statut(J.editeur, 'PATCH', E(), { metadata: { test: 1 } })).toBe(200)
    expect(await statut(J.editeur, 'PUT', `${E()}/design`, { targetN: 12 })).toBe(200)
    expect(await statut(J.editeur, 'DELETE', `${E()}/sessions`)).toBe(403)
  })

  it('un élément d’une autre étude ne peut pas être visé par l’adresse de l’étude (404)', async () => {
    expect(await statut(J.proprio, 'DELETE', `${E()}/blocks/${ids.blocAutre}`)).toBe(404)
    expect(await statut(J.proprio, 'PUT', `${E()}/blocks/${ids.blocAutre}/questions/${ids.question}`, { text: 'x' })).toBe(404)
    expect(await prisma.block.findUnique({ where: { id: ids.blocAutre } })).not.toBeNull()
  })
})
