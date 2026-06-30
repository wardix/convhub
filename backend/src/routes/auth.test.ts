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
      expect(data.user).toBeDefined()
      expect(res.headers.get('set-cookie')).toContain('access_token')
    })

    it('should reject wrong password', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'WrongPassword!',
        }),
      })

      expect(res.status).toBe(401)
    })

    it('should reject missing email or password', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/auth/google', () => {
    it('should redirect to google oauth page', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test_client_id'
      const res = await app.request('/api/auth/google')

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toContain(
        'accounts.google.com/o/oauth2/v2/auth',
      )
    })
  })

  describe('GET /api/auth/google/callback', () => {
    it('should block new user registration if DISABLE_SIGNUP is true', async () => {
      // Setup environment and mocks
      process.env.DISABLE_SIGNUP = 'true'
      process.env.GOOGLE_CLIENT_ID = 'test'
      process.env.GOOGLE_CLIENT_SECRET = 'test'

      const originalFetch = globalThis.fetch
      globalThis.fetch = async (url: string | URL | Request) => {
        const urlStr = url.toString()
        if (urlStr.includes('oauth2.googleapis.com/token')) {
          return {
            ok: true,
            json: async () => ({ access_token: 'test_token' }),
          } as Response
        }
        if (urlStr.includes('googleapis.com/oauth2/v2/userinfo')) {
          return {
            ok: true,
            json: async () => ({
              id: '999999',
              email: 'newgoogleuser@example.com',
              name: 'New Google User',
              picture: 'http://example.com/pic.jpg',
            }),
          } as Response
        }
        return new Response(null, { status: 404 })
      }

      try {
        const res = await app.request('/api/auth/google/callback?code=testcode')
        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toBe('/?error=signup_disabled')
      } finally {
        process.env.DISABLE_SIGNUP = 'false'
        globalThis.fetch = originalFetch
      }
    })
  })

  describe('Rate Limiting', () => {
    it('should rate limit register endpoint (4th attempt returns 429)', async () => {
      // 3 successful (or invalid) requests
      for (let i = 0; i < 3; i++) {
        await app.request('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '192.168.1.100',
          },
          body: JSON.stringify({ email: `test${i}@example.com` }),
        })
      }

      // 4th request should fail with 429
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.100',
        },
        body: JSON.stringify({ email: 'test4@example.com' }),
      })

      expect(res.status).toBe(429)
      expect(res.headers.get('Retry-After')).toBeTruthy()
    })

    it('should rate limit login endpoint (6th attempt returns 429)', async () => {
      // 5 requests
      for (let i = 0; i < 5; i++) {
        await app.request('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '192.168.1.100',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'wrong',
          }),
        })
      }

      // 6th request should fail with 429
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.100',
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
      })

      expect(res.status).toBe(429)
      expect(res.headers.get('Retry-After')).toBeTruthy()
    })
  })
})
