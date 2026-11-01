// SPDX-License-Identifier: AGPL-3.0-or-later
// Comptes (routes/auth.js) : la déconnexion et le changement de mot de passe
// ferment les sessions (tokenVersion) ; une nouvelle adresse e-mail demande le
// mot de passe actuel puis la confirmation par le lien envoyé ; le lien de
// vérification est retrouvé par son empreinte (anciens liens bcrypt acceptés).
// Test d'intégration : backend lancé sur le port 3002 (comme tests/jetons.test.js).

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createHmac, createHash } from 'crypto'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { echapper } from '../src/lib/email.js'

if (!process.env.JWT_SECRET) dotenv.config({ quiet: true })

const BASE = 'http://localhost:3002'
const prisma = new PrismaClient()
const NOM = `comptes${Date.now()}`
const MDP = 'MotDePasse-Test-1'
let user

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function signer(contenu) {
  const t = Math.floor(Date.now() / 1000)
  const corps = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ ...contenu, iat: t, exp: t + 300 })}`
  return `${corps}.${createHmac('sha256', process.env.JWT_SECRET).update(corps).digest('base64url')}`
}
const base = () => ({ id: user.id, username: user.username, email: user.email })
const acces = () => signer({ ...base(), typ: 'access' })
const cookie = (jeton) => ({ Cookie: `refreshToken=${jeton}` })
const post = async (url, { corps, headers = {} } = {}) => {
  const res = await fetch(BASE + url, {
    method: url === '/api/auth/profile' ? 'PATCH' : 'POST',
    headers: { ...headers, ...(corps ? { 'Content-Type': 'application/json' } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  })
  let data = null
  try { data = await res.json() } catch {}
  return { statut: res.status, data, cookie: res.headers.get('set-cookie') || '' }
}
const version = async () => (await prisma.user.findUnique({ where: { id: user.id }, select: { tokenVersion: true } })).tokenVersion

describe('Comptes : sessions, adresse e-mail, liens', () => {
  beforeAll(async () => {
    user = await prisma.user.create({ data: { username: NOM, email: `${NOM}@test.com`, password: await bcrypt.hash(MDP, 4), emailVerified: true } })
  })
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { username: { startsWith: NOM } } })
    await prisma.$disconnect()
  })

  it('la déconnexion ferme la session : le jeton de rafraîchissement ne marche plus', async () => {
    const v = await version()
    const jeton = signer({ ...base(), typ: 'refresh', tv: v })
    expect((await post('/api/auth/refresh', { headers: cookie(jeton) })).statut).toBe(200)
    expect((await post('/api/auth/logout', { headers: cookie(jeton) })).statut).toBe(200)
    expect(await version()).toBe(v + 1)
    expect((await post('/api/auth/refresh', { headers: cookie(jeton) })).statut).toBe(401)
    // Un nouveau jeton (nouvelle connexion) fonctionne.
    expect((await post('/api/auth/refresh', { headers: cookie(signer({ ...base(), typ: 'refresh', tv: v + 1 })) })).statut).toBe(200)
  })

  it('les jetons émis avant ce changement (sans version) restent valables tant que le compte n’a pas été déconnecté', async () => {
    const autre = await prisma.user.create({ data: { username: `${NOM}b`, email: `${NOM}b@test.com`, password: 'x', emailVerified: true } })
    const ancien = signer({ id: autre.id, username: autre.username, email: autre.email, typ: 'refresh' })
    expect((await post('/api/auth/refresh', { headers: cookie(ancien) })).statut).toBe(200)
  })

  it('changer de mot de passe ferme les autres sessions et en ouvre une nouvelle', async () => {
    const v = await version()
    const ancien = signer({ ...base(), typ: 'refresh', tv: v })
    const r = await post('/api/auth/change-password', { corps: { currentPassword: MDP, newPassword: `${MDP}-2` }, headers: { Authorization: `Bearer ${acces()}` } })
    expect(r.statut).toBe(200)
    expect(r.data.accessToken).toBeTruthy()
    expect(r.cookie).toContain('refreshToken=')
    expect((await post('/api/auth/refresh', { headers: cookie(ancien) })).statut).toBe(401)
    const nouveau = r.cookie.match(/refreshToken=([^;]+)/)[1]
    expect((await post('/api/auth/refresh', { headers: cookie(nouveau) })).statut).toBe(200)
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(MDP, 4) } })
  })

  it('nouvelle adresse : mot de passe exigé, adresse changée seulement après le lien', async () => {
    const auth = { Authorization: `Bearer ${acces()}` }
    const nouvelle = `${NOM}.nouvelle@test.com`
    expect((await post('/api/auth/profile', { corps: { email: nouvelle }, headers: auth })).statut).toBe(400)
    expect((await post('/api/auth/profile', { corps: { email: nouvelle, currentPassword: 'faux' }, headers: auth })).statut).toBe(400)

    const r = await post('/api/auth/profile', { corps: { email: nouvelle, currentPassword: MDP }, headers: auth })
    expect(r.statut).toBe(200)
    expect(r.data.user.email).toBe(`${NOM}@test.com`)
    expect(r.data.user.pendingEmail).toBe(nouvelle)

    // Le lien envoyé : on fixe un lien connu (seule son empreinte est stockée).
    const lien = 'b'.repeat(64)
    await prisma.user.update({ where: { id: user.id }, data: { verificationToken: createHash('sha256').update(lien).digest('hex') } })
    expect((await post('/api/auth/verify-email', { corps: { token: 'mauvais' } })).statut).toBe(400)
    const v = await post('/api/auth/verify-email', { corps: { token: lien } })
    expect(v.statut).toBe(200)
    expect(v.data.changementEmail).toBe(true)
    const apres = await prisma.user.findUnique({ where: { id: user.id } })
    expect(apres.email).toBe(nouvelle)
    expect(apres.pendingEmail).toBeNull()
    expect(apres.verificationToken).toBeNull()
    user = apres
  })

  it('changer seulement le nom ne demande pas le mot de passe', async () => {
    const r = await post('/api/auth/profile', { corps: { username: `${NOM}c`, email: user.email }, headers: { Authorization: `Bearer ${acces()}` } })
    expect(r.statut).toBe(200)
    expect(r.data.user.username).toBe(`${NOM}c`)
  })

  it('vérification à l’inscription : nouveau lien (empreinte) et ancien lien (bcrypt)', async () => {
    const u1 = await prisma.user.create({ data: { username: `${NOM}d`, email: `${NOM}d@test.com`, password: 'x', verificationToken: createHash('sha256').update('c'.repeat(64)).digest('hex'), verificationTokenExp: new Date(Date.now() + 3600e3) } })
    const u2 = await prisma.user.create({ data: { username: `${NOM}e`, email: `${NOM}e@test.com`, password: 'x', verificationToken: await bcrypt.hash('d'.repeat(64), 4), verificationTokenExp: new Date(Date.now() + 3600e3) } })
    expect((await post('/api/auth/verify-email', { corps: { token: 'c'.repeat(64) } })).statut).toBe(200)
    expect((await post('/api/auth/verify-email', { corps: { token: 'd'.repeat(64) } })).statut).toBe(200)
    const verifies = await prisma.user.findMany({ where: { id: { in: [u1.id, u2.id] } }, select: { emailVerified: true } })
    expect(verifies.every((u) => u.emailVerified)).toBe(true)
  })

  it('e-mails : les noms ne sont jamais du HTML', () => {
    expect(echapper('<b>Équipe</b> & "co"')).toBe('&lt;b&gt;Équipe&lt;/b&gt; &amp; &quot;co&quot;')
    expect(echapper(null)).toBe('')
  })
})
