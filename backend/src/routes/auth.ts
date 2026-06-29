import type { Context } from 'hono'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { sql } from '../db/connection.js'
import { authRequired } from '../middleware/auth.js'
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

auth.post('/register', async (c) => {
  try {
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

auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()

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

auth.post('/google', async (c) => {
  // In a real implementation, we would verify the Google credential using google-auth-library
  // Since we don't have it installed, we'll implement a stub that simulates verification
  try {
    const { credential } = await c.req.json()
    if (!credential)
      return c.json({ error: 'Credential required', status: 400 }, 400)

    // STUB: normally verify Google ID token here and extract payload
    // We assume the credential string contains user info for testing purposes (e.g. JSON stringified)
    let payload: Record<string, string>
    try {
      payload = JSON.parse(credential)
    } catch {
      return c.json(
        { error: 'Invalid Google credential format (test stub)', status: 400 },
        400,
      )
    }

    const { email, sub: oauthId, name, picture } = payload

    let [user] = await sql`
      SELECT * FROM users WHERE email = ${email} OR (oauth_provider = 'google' AND oauth_id = ${oauthId})
    `

    if (!user) {
      const username = `${email.split('@')[0]}_${Math.random().toString(36).substring(2, 7)}`

      const rows = await sql`
        INSERT INTO users (email, username, display_name, avatar_url, oauth_provider, oauth_id)
        VALUES (${email}, ${username}, ${name}, ${picture}, 'google', ${oauthId})
        RETURNING *
      `
      user = rows[0]
    } else if (!user.oauth_provider) {
      const rows = await sql`
        UPDATE users SET oauth_provider = 'google', oauth_id = ${oauthId} 
        WHERE id = ${user.id} RETURNING *
      `
      user = rows[0]
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
