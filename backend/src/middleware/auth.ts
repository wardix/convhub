import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verifyAccessToken } from '../utils/jwt.js'

export async function authRequired(c: Context, next: Next) {
  const token = getCookie(c, 'access_token')

  if (!token) {
    return c.json({ error: 'Unauthorized', status: 401 }, 401)
  }

  try {
    const payload = await verifyAccessToken(token)
    c.set('userId', payload.sub)
    await next()
  } catch (_err) {
    return c.json({ error: 'Invalid or expired token', status: 401 }, 401)
  }
}

export async function authOptional(c: Context, next: Next) {
  const token = getCookie(c, 'access_token')

  if (token) {
    try {
      const payload = await verifyAccessToken(token)
      c.set('userId', payload.sub)
    } catch (_err) {
      // Ignore invalid tokens for optional auth
    }
  }

  await next()
}
