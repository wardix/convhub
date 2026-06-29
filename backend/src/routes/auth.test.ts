import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { auth } from './auth.js'

const app = new Hono()
app.route('/api/auth', auth)

describe('auth routes', () => {
  beforeAll(async () => {
    // Clear users table for clean state
    try {
      await sql`TRUNCATE TABLE users CASCADE`
    } catch (_e) {
      console.warn('Could not truncate users table')
    }
  })

  afterAll(async () => {
    // Cleanup after tests
    try {
      await sql`TRUNCATE TABLE users CASCADE`
    } catch (_e) {
      console.warn('Could not truncate users table')
    }
  })

  const testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'securepass123',
    display_name: 'Test User',
  }

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.user.email).toBe(testUser.email)
      expect(data.user.username).toBe(testUser.username)
      expect(data.user.password_hash).toBeUndefined() // Should not return hash

      const cookies = res.headers.get('set-cookie')
      expect(cookies).toBeDefined()
      expect(cookies).toContain('access_token')
      expect(cookies).toContain('refresh_token')
    })

    it('should reject invalid email', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...testUser, email: 'invalid' }),
      })
      expect(res.status).toBe(400)
    })

    it('should reject duplicate user', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      })
      expect(res.status).toBe(409)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user.email).toBe(testUser.email)

      const cookies = res.headers.get('set-cookie')
      expect(cookies).toBeDefined()
    })

    it('should reject wrong password', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'wrongpassword',
        }),
      })
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/google', () => {
    it('should handle google oauth stub', async () => {
      const googleStub = JSON.stringify({
        email: 'google@example.com',
        sub: 'google123',
        name: 'Google User',
        picture: 'http://example.com/pic.jpg',
      })

      const res = await app.request('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: googleStub }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user.email).toBe('google@example.com')
      expect(data.user.oauth_provider).toBeUndefined() // Should not return oauth info
    })
  })
})
