import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const BASE = 'http://localhost:3002'

// These tests require a running backend with a test database
// They are integration tests run during CI with a real PostgreSQL

describe('Auth Routes', () => {
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@test.com`,
    password: 'TestPassword123!',
  }

  describe('POST /api/auth/register', () => {
    it('should create a new user', async () => {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      })
      const data = await res.json()
      expect(res.status).toBe(201)
      expect(data.message).toContain('Vérifiez')
    })

    it('should reject duplicate email', async () => {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      })
      expect(res.status).toBe(400)
    })

    it('should reject short password', async () => {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'short', email: 'short@test.com', password: '123' }),
      })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should reject wrong password', async () => {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: testUser.email, password: 'wrong' }),
      })
      expect(res.status).toBe(401)
    })

    it('should reject unverified email', async () => {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: testUser.email, password: testUser.password }),
      })
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.emailNotVerified).toBe(true)
    })
  })

  describe('POST /api/auth/forgot-password', () => {
    it('should return success even for unknown email', async () => {
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'unknown@test.com' }),
      })
      expect(res.status).toBe(200)
    })
  })
})

describe('Security', () => {
  it('should reject unauthenticated access to projects', async () => {
    const res = await fetch(`${BASE}/api/projects`)
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to admin', async () => {
    const res = await fetch(`${BASE}/api/admin/users`)
    expect(res.status).toBe(401)
  })

  it('should have rate limiting on login', async () => {
    const promises = Array.from({ length: 10 }, () =>
      fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'brute@test.com', password: 'wrong' }),
      })
    )
    const responses = await Promise.all(promises)
    const statuses = responses.map(r => r.status)
    // At least one should be rate limited (429)
    expect(statuses.some(s => s === 429)).toBe(true)
  })
})
