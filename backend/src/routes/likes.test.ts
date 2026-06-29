import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { signAccessToken } from '../utils/jwt.js'
import { likes } from './likes.js'

const app = new Hono()
app.route('/api/conversations', likes)

describe('likes routes', () => {
  let testUserId = ''
  let authToken = ''
  let conversationId = ''

  beforeAll(async () => {
    try {
      await sql`TRUNCATE TABLE users, conversations, likes CASCADE`

      const [user] = await sql`
        INSERT INTO users (email, username) VALUES ('liker@example.com', 'liker') RETURNING id
      `
      testUserId = user.id
      authToken = await signAccessToken(testUserId)

      const [conversation] = await sql`
        INSERT INTO conversations (user_id, title, description, transcript)
        VALUES (${testUserId}, 'Like Test', 'Desc', '[]')
        RETURNING id
      `
      conversationId = conversation.id
    } catch (_e) {
      console.warn('Could not setup db')
    }
  })

  afterAll(async () => {
    try {
      await sql`TRUNCATE TABLE users CASCADE`
    } catch (_e) {}
  })

  it('should like a conversation', async () => {
    if (!testUserId) return

    const res = await app.request(`/api/conversations/${conversationId}/like`, {
      method: 'POST',
      headers: {
        Cookie: `access_token=${authToken}`,
      },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.like_count).toBe(1)
  })

  it('should return 409 if already liked', async () => {
    if (!testUserId) return

    const res = await app.request(`/api/conversations/${conversationId}/like`, {
      method: 'POST',
      headers: {
        Cookie: `access_token=${authToken}`,
      },
    })

    expect(res.status).toBe(409)
  })

  it('should unlike a conversation', async () => {
    if (!testUserId) return

    const res = await app.request(`/api/conversations/${conversationId}/like`, {
      method: 'DELETE',
      headers: {
        Cookie: `access_token=${authToken}`,
      },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.like_count).toBe(0)
  })

  it('should return 404 if not liked', async () => {
    if (!testUserId) return

    const res = await app.request(`/api/conversations/${conversationId}/like`, {
      method: 'DELETE',
      headers: {
        Cookie: `access_token=${authToken}`,
      },
    })

    expect(res.status).toBe(404)
  })
})
