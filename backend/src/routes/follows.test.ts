import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { signAccessToken } from '../utils/jwt.js'
import { follows } from './follows.js'

const app = new Hono()
app.route('/api/users', follows)

describe('follows routes', () => {
  let user1Id = ''
  let user2Id = ''
  let user1Token = ''
  let user2Token = ''

  beforeAll(async () => {
    try {
      await sql`TRUNCATE TABLE users, follows CASCADE`

      const [u1] = await sql`
        INSERT INTO users (email, username, display_name) VALUES ('user1@example.com', 'user1', 'User 1') RETURNING id
      `
      user1Id = u1.id
      user1Token = await signAccessToken(user1Id)

      const [u2] = await sql`
        INSERT INTO users (email, username, display_name) VALUES ('user2@example.com', 'user2', 'User 2') RETURNING id
      `
      user2Id = u2.id
      user2Token = await signAccessToken(user2Id)
    } catch (_e) {
      console.warn('Could not setup db')
    }
  })

  afterAll(async () => {
    try {
      await sql`TRUNCATE TABLE users CASCADE`
    } catch (_e) {}
  })

  it('should allow user1 to follow user2', async () => {
    if (!user1Id) return

    const res = await app.request(`/api/users/${user2Id}/follow`, {
      method: 'POST',
      headers: {
        Cookie: `access_token=${user1Token}`,
      },
    })

    expect(res.status).toBe(200)
  })

  it('should return 409 if already following', async () => {
    if (!user1Id) return

    const res = await app.request(`/api/users/${user2Id}/follow`, {
      method: 'POST',
      headers: {
        Cookie: `access_token=${user1Token}`,
      },
    })

    expect(res.status).toBe(409)
  })

  it('should prevent following yourself', async () => {
    if (!user1Id) return

    const res = await app.request(`/api/users/${user1Id}/follow`, {
      method: 'POST',
      headers: {
        Cookie: `access_token=${user1Token}`,
      },
    })

    expect(res.status).toBe(400)
  })

  it('should list followers', async () => {
    if (!user1Id) return

    const res = await app.request(`/api/users/${user2Id}/followers`, {
      headers: {
        Cookie: `access_token=${user2Token}`,
      },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.length).toBe(1)
    expect(data.data[0].id).toBe(user1Id)
    expect(data.data[0].isFollowing).toBe(false)
  })

  it('should allow user1 to unfollow user2', async () => {
    if (!user1Id) return

    const res = await app.request(`/api/users/${user2Id}/follow`, {
      method: 'DELETE',
      headers: {
        Cookie: `access_token=${user1Token}`,
      },
    })

    expect(res.status).toBe(204)
  })

  it('should return 404 if not following', async () => {
    if (!user1Id) return

    const res = await app.request(`/api/users/${user2Id}/follow`, {
      method: 'DELETE',
      headers: {
        Cookie: `access_token=${user1Token}`,
      },
    })

    expect(res.status).toBe(404)
  })
})
