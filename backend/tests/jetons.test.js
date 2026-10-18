// SPDX-License-Identifier: AGPL-3.0-or-later
// Types de jetons (server.js `authenticate`, routes/auth.js) : seul un jeton
// d'accès ouvre l'API. Le jeton temporaire de la 2FA (délivré dès que le mot
// de passe est bon) ne doit ni ouvrir l'API ni être échangé contre une
// session sur /refresh — sinon le mot de passe suffirait, sans le code.
// Test d'intégration : backend lancé sur le port 3002 avec une base de test.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createHmac } from 'crypto'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

if (!process.env.JWT_SECRET) dotenv.config({ quiet: true })

const BASE = 'http://localhost:3002'
const prisma = new PrismaClient()
const NOM = `jetons${Date.now()}`
let user

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function signer(contenu) {
  const t = Math.floor(Date.now() / 1000)
  const corps = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ ...contenu, iat: t, exp: t + 300 })}`
  return `${corps}.${createHmac('sha256', process.env.JWT_SECRET).update(corps).digest('base64url')}`
}
const moi = async (jeton) => (await fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${jeton}` } })).status
const rafraichir = async (jeton) => (await fetch(`${BASE}/api/auth/refresh`, { method: 'POST', headers: { Cookie: `refreshToken=${jeton}` } })).status

describe('Types de jetons', () => {
  beforeAll(async () => {
    user = await prisma.user.create({ data: { username: NOM, email: `${NOM}@test.com`, password: 'x', emailVerified: true } })
  })
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { username: NOM } })
    await prisma.$disconnect()
  })

  const base = () => ({ id: user.id, username: user.username, email: user.email })

  it('le jeton temporaire de la 2FA n’ouvre pas l’API', async () => {
    expect(await moi(signer({ id: user.id, purpose: '2fa' }))).toBe(401)
    expect(await moi(signer({ id: user.id, purpose: '2fa', typ: '2fa' }))).toBe(401)
  })

  it('le jeton temporaire de la 2FA ne s’échange pas sur /refresh', async () => {
    expect(await rafraichir(signer({ id: user.id, purpose: '2fa', typ: '2fa' }))).toBe(401)
  })

  it('un jeton de rafraîchissement n’ouvre pas l’API, et un jeton d’accès ne rafraîchit pas', async () => {
    expect(await moi(signer({ ...base(), typ: 'refresh' }))).toBe(401)
    expect(await rafraichir(signer({ ...base(), typ: 'access' }))).toBe(401)
  })

  it('les jetons valides fonctionnent (y compris les anciens, sans type)', async () => {
    expect(await moi(signer({ ...base(), typ: 'access' }))).toBe(200)
    expect(await moi(signer(base()))).toBe(200)
    expect(await rafraichir(signer({ ...base(), typ: 'refresh' }))).toBe(200)
    expect(await rafraichir(signer(base()))).toBe(200)
  })
})
