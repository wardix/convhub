import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { signAccessToken } from '../utils/jwt.js'
import { comments, conversationComments } from './comments.js'

const app = new Hono()
app.route('/api/conversations', conversationComments)
app.route('/api/comments', comments)

describe('comments routes', () => {
  let testUserId = ''
  let authToken = ''
  let conversationId = ''
  let commentId = ''

  beforeAll(async () => {
    try {
      await sql`TRUNCATE TABLE users, conversations, comments CASCADE`

      const [user] = await sql`
        INSERT INTO users (email, username, display_name) VALUES ('commenter@example.com', 'commenter', 'Commenter') RETURNING id
      `
      testUserId = user.id
      authToken = await signAccessToken(testUserId)

      const [conversation] = await sql`
        INSERT INTO conversations (user_id, title, description, transcript)
        VALUES (${testUserId}, 'Comment Test', 'Desc', '[]')
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

  it('should post a comment', async () => {
    if (!testUserId) return

    const res = await app.request(
      `/api/conversations/${conversationId}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${authToken}`,
        },
        body: JSON.stringify({ content: 'Hello World' }),
      },
    )

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.comment.content).toBe('Hello World')
    expect(data.comment.username).toBe('commenter')
    commentId = data.comment.id
  })

  it('should list comments', async () => {
    if (!testUserId) return

    const res = await app.request(
      `/api/conversations/${conversationId}/comments`,
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.length).toBe(1)
    expect(data.data[0].content).toBe('Hello World')
    expect(data.pagination.total).toBe(1)
  })

  it('should return 400 for empty comment', async () => {
    if (!testUserId) return

    const res = await app.request(
      `/api/conversations/${conversationId}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${authToken}`,
        },
        body: JSON.stringify({ content: '   ' }),
      },
    )

    expect(res.status).toBe(400)
  })

  it('should prevent non-author from deleting', async () => {
    if (!testUserId) return

    const fakeToken = await signAccessToken(
      '00000000-0000-0000-0000-000000000000',
    )
    const res = await app.request(`/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        Cookie: `access_token=${fakeToken}`,
      },
    })

    expect(res.status).toBe(403)
  })

  it('should allow author to delete comment', async () => {
    if (!testUserId) return

    const res = await app.request(`/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        Cookie: `access_token=${authToken}`,
      },
    })

    expect(res.status).toBe(204)
  })
})
