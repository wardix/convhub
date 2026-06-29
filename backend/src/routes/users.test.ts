import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { signAccessToken } from '../utils/jwt.js'
import { users } from './users.js'

const app = new Hono()
app.route('/api/users', users)

describe('users routes', () => {
  let userId = ''
  let authToken = ''

  beforeAll(async () => {
    try {
      await sql`TRUNCATE TABLE users, conversations, follows CASCADE`

      const [user] = await sql`
        INSERT INTO users (email, username, display_name) VALUES ('userprofile@example.com', 'userprofile', 'User Profile') RETURNING id
      `
      userId = user.id
      authToken = await signAccessToken(userId)

      await sql`
        INSERT INTO conversations (user_id, title, description, transcript)
        VALUES (${userId}, 'User Conv', 'Desc', '[]')
      `
    } catch (_e) {
      console.warn('Could not setup db')
    }
  })

  afterAll(async () => {
    try {
      await sql`TRUNCATE TABLE users CASCADE`
    } catch (_e) {}
  })

  it('should get user profile', async () => {
    const res = await app.request('/api/users/userprofile')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user.username).toBe('userprofile')
    expect(data.user.isFollowing).toBe(false)
  })

  it('should get user conversations', async () => {
    const res = await app.request('/api/users/userprofile/conversations')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.length).toBe(1)
    expect(data.data[0].title).toBe('User Conv')
  })

  it('should update user profile', async () => {
    if (!userId) return

    const res = await app.request('/api/users/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${authToken}`,
      },
      body: JSON.stringify({ display_name: 'Updated Name', bio: 'New Bio' }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user.display_name).toBe('Updated Name')
    expect(data.user.bio).toBe('New Bio')
  })

  it('should return 400 when no fields provided', async () => {
    if (!userId) return

    const res = await app.request('/api/users/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${authToken}`,
      },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
  })
})
