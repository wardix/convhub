import type { Context } from 'hono'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { sql } from '../db/connection.js'
import { authRequired } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from '../utils/validation.js'

const auth = new Hono()

const loginLimiter = rateLimit({ limit: 5, windowMs: 60 * 1000 }) // 5 requests per minute
const registerLimiter = rateLimit({ limit: 3, windowMs: 60 * 60 * 1000 }) // 3 requests per hour

function setAuthCookies(c: Context, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production'

  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  })

  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

auth.post('/register', registerLimiter, async (c) => {
  try {
    if (process.env.DISABLE_SIGNUP === 'true') {
      return c.json(
        { error: 'Registration is currently disabled', status: 403 },
        403,
      )
    }

    const { email, username, password, display_name } = await c.req.json()

    if (!validateEmail(email))
      return c.json({ error: 'Invalid email', status: 400 }, 400)

    const pwCheck = validatePassword(password)
    if (!pwCheck.valid)
      return c.json({ error: pwCheck.message, status: 400 }, 400)

    const unCheck = validateUsername(username)
    if (!unCheck.valid)
      return c.json({ error: unCheck.message, status: 400 }, 400)

    const [existing] = await sql`
      SELECT id FROM users WHERE email = ${email} OR username = ${username}
    `
    if (existing) {
      return c.json(
        { error: 'Email or username already exists', status: 409 },
        409,
      )
    }

    const hashed = await hashPassword(password)
    const [user] = await sql`
      INSERT INTO users (email, username, display_name, password_hash)
      VALUES (${email}, ${username}, ${display_name || null}, ${hashed})
      RETURNING id, email, username, display_name, avatar_url, bio, created_at
    `

    const accessToken = await signAccessToken(user.id)
    const refreshToken = await signRefreshToken(user.id)

    // Hash refresh token for DB storage
    const rtHash = await hashPassword(refreshToken)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await sql`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${rtHash}, ${expiresAt.toISOString()})
    `

    setAuthCookies(c, accessToken, refreshToken)
    return c.json({ user }, 201)
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

auth.post('/login', loginLimiter, async (c) => {
  try {
    const { email, password } = await c.req.json().catch(() => ({}))

    if (!email || !password) {
      return c.json(
        { error: 'Email and password are required', status: 400 },
        400,
      )
    }

    const [user] = await sql`
      SELECT * FROM users WHERE email = ${email}
    `
    if (!user || !user.password_hash) {
      return c.json({ error: 'Invalid credentials', status: 401 }, 401)
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return c.json({ error: 'Invalid credentials', status: 401 }, 401)
    }

    const accessToken = await signAccessToken(user.id)
    const refreshToken = await signRefreshToken(user.id)

    const rtHash = await hashPassword(refreshToken)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await sql`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${rtHash}, ${expiresAt.toISOString()})
    `

    setAuthCookies(c, accessToken, refreshToken)

    const { password_hash, oauth_provider, oauth_id, ...userData } = user
    return c.json({ user: userData }, 200)
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

auth.get('/google', (_c) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return _c.json({ error: 'Google OAuth not configured', status: 500 }, 500)
  }

  const callbackUrl =
    process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:3000/api/auth/google/callback'
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })

  return _c.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  )
})

auth.get('/google/callback', async (c) => {
  try {
    const code = c.req.query('code')
    if (!code) {
      return c.redirect('/?error=google_auth_failed')
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const callbackUrl =
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3000/api/auth/google/callback'

    if (!clientId || !clientSecret) {
      return c.redirect('/?error=google_not_configured')
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      return c.redirect('/?error=google_token_exchange_failed')
    }

    const tokenData = (await tokenRes.json()) as { access_token: string }

    // Get user info
    const userInfoRes = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    )

    if (!userInfoRes.ok) {
      return c.redirect('/?error=google_userinfo_failed')
    }

    const googleUser = (await userInfoRes.json()) as {
      id: string
      email: string
      name: string
      picture: string
    }

    // Find or create user
    const existing =
      await sql`SELECT id FROM users WHERE oauth_provider = 'google' AND oauth_id = ${googleUser.id}`

    let userId: string

    if (existing.length > 0) {
      userId = existing[0].id
    } else {
      // Check if email already exists (link accounts)
      const byEmail =
        await sql`SELECT id FROM users WHERE email = ${googleUser.email}`

      if (byEmail.length > 0) {
        // Link Google to existing account
        userId = byEmail[0].id
        await sql`UPDATE users SET oauth_provider = 'google', oauth_id = ${googleUser.id}, avatar_url = ${googleUser.picture} WHERE id = ${userId}`
      } else {
        if (process.env.DISABLE_SIGNUP === 'true') {
          return c.redirect('/?error=signup_disabled')
        }
        // Create new user
        const username = `${googleUser.email.split('@')[0]}_${Date.now().toString(36)}`
        const [newUser] = await sql`
          INSERT INTO users (email, username, display_name, avatar_url, password_hash, oauth_provider, oauth_id)
          VALUES (${googleUser.email}, ${username}, ${googleUser.name}, ${googleUser.picture}, '', 'google', ${googleUser.id})
          RETURNING id
        `
        userId = newUser.id
      }
    }

    // Issue tokens
    const accessToken = await signAccessToken(userId)
    const refreshToken = await signRefreshToken(userId)
    const rtHash = await hashPassword(refreshToken)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await sql`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (${userId}, ${rtHash}, ${expiresAt.toISOString()})
    `

    setAuthCookies(c, accessToken, refreshToken)
    return c.redirect('/')
  } catch (_err) {
    return c.redirect('/?error=google_auth_error')
  }
})

auth.post('/refresh', async (c) => {
  try {
    const token = getCookie(c, 'refresh_token')
    if (!token) return c.json({ error: 'No refresh token', status: 401 }, 401)

    let payload: Record<string, unknown>
    try {
      payload = await verifyRefreshToken(token)
    } catch {
      return c.json({ error: 'Invalid refresh token', status: 401 }, 401)
    }

    const userId = payload.sub as string

    // Find the token in the database
    const dbTokens = await sql`
      SELECT id, token_hash FROM refresh_tokens WHERE user_id = ${userId} AND expires_at > NOW()
    `

    let validDbTokenId = null
    for (const row of dbTokens) {
      if (await verifyPassword(token, row.token_hash)) {
        validDbTokenId = row.id
        break
      }
    }

    if (!validDbTokenId) {
      return c.json(
        { error: 'Refresh token revoked or not found', status: 401 },
        401,
      )
    }

    // Rotate tokens
    await sql`DELETE FROM refresh_tokens WHERE id = ${validDbTokenId}`

    const newAccessToken = await signAccessToken(userId)
    const newRefreshToken = await signRefreshToken(userId)

    const rtHash = await hashPassword(newRefreshToken)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await sql`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (${userId}, ${rtHash}, ${expiresAt.toISOString()})
    `

    setAuthCookies(c, newAccessToken, newRefreshToken)
    return c.json({ success: true }, 200)
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

auth.post('/logout', async (c) => {
  try {
    const token = getCookie(c, 'refresh_token')
    if (token) {
      try {
        const payload = await verifyRefreshToken(token)
        const userId = payload.sub as string
        const dbTokens =
          await sql`SELECT id, token_hash FROM refresh_tokens WHERE user_id = ${userId}`

        for (const row of dbTokens) {
          if (await verifyPassword(token, row.token_hash)) {
            await sql`DELETE FROM refresh_tokens WHERE id = ${row.id}`
            break
          }
        }
      } catch {
        // Ignore token errors during logout
      }
    }

    deleteCookie(c, 'access_token', { path: '/' })
    deleteCookie(c, 'refresh_token', { path: '/' })

    return c.json({ success: true }, 200)
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

auth.get('/me', authRequired, async (c) => {
  try {
    const userId = c.get('userId')
    const [user] = await sql`
      SELECT id, email, username, display_name, avatar_url, bio, created_at, updated_at 
      FROM users WHERE id = ${userId}
    `
    if (!user) {
      return c.json({ error: 'User not found', status: 404 }, 404)
    }

    return c.json({ user }, 200)
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

export { auth }
