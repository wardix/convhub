import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { signAccessToken } from '../utils/jwt.js'
import { authOptional, authRequired } from './auth.js'

describe('auth middleware', () => {
  it('authRequired should reject requests without token', async () => {
    const app = new Hono()
    app.get('/', authRequired, (c) => c.text('ok'))

    const res = await app.request('/')
    expect(res.status).toBe(401)
  })

  it('authRequired should accept requests with valid token', async () => {
    const app = new Hono()
    app.get('/', authRequired, (c) => {
      const userId = c.get('userId')
      return c.json({ userId })
    })

    const token = await signAccessToken('user-123')

    const res = await app.request('/', {
      headers: {
        Cookie: `access_token=${token}`,
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userId).toBe('user-123')
  })

  it('authOptional should not reject without token', async () => {
    const app = new Hono()
    app.get('/', authOptional, (c) => c.text('ok'))

    const res = await app.request('/')
    expect(res.status).toBe(200)
  })
})
