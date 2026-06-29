import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { signAccessToken } from '../utils/jwt.js'
import { conversations } from './conversations.js'

const app = new Hono()
app.route('/api/conversations', conversations)

describe('conversations routes', () => {
  let testUserId = ''
  let authToken = ''
  let otherAuthToken = ''

  beforeAll(async () => {
    try {
      await sql`TRUNCATE TABLE users CASCADE`
      const [user] = await sql`
        INSERT INTO users (email, username) VALUES ('testconv@example.com', 'testconv') RETURNING id
      `
      testUserId = user.id
      authToken = await signAccessToken(testUserId)

      const [otherUser] = await sql`
        INSERT INTO users (email, username) VALUES ('other@example.com', 'other') RETURNING id
      `
      otherAuthToken = await signAccessToken(otherUser.id)
    } catch (_e) {
      console.warn('Could not setup db')
    }
  })

  afterAll(async () => {
    try {
      await sql`TRUNCATE TABLE users CASCADE`
    } catch (_e) {}
  })

  let conversationId = ''

  it('should create conversation via POST /api/conversations', async () => {
    if (!testUserId) return // skip if db not setup

    const formData = new FormData()
    const fileContent = `{"step_index":0,"type":"USER_INPUT","source":"USER_EXPLICIT","status":"DONE","created_at":"2023-01-01"}\n{"step_index":1,"type":"PLANNER_RESPONSE","source":"MODEL","status":"DONE","created_at":"2023-01-01"}`

    formData.append('title', 'Test Conversation')
    formData.append('description', 'Test Description')
    const tagsArr = Array.from({ length: 15 }, (_, i) => `tag${i}`)
    formData.append('tags', tagsArr.join(', '))
    formData.append(
      'file',
      new File([fileContent], 'transcript.jsonl', { type: 'application/json' }),
    )

    const res = await app.request('/api/conversations', {
      method: 'POST',
      headers: {
        Cookie: `access_token=${authToken}`,
      },
      body: formData,
    })

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.conversation.title).toBe('Test Conversation')
    expect(data.conversation.message_count).toBe(2)

    conversationId = data.conversation.id
  })

  it('should reject title exceeding 200 chars', async () => {
    const formData = new FormData()
    formData.append('title', 'a'.repeat(201))
    formData.append(
      'file',
      new Blob(['{"type": "USER_INPUT", "content": "Hello"}']),
    )

    const res = await app.request('/api/conversations', {
      method: 'POST',
      headers: { Cookie: `access_token=${authToken}` },
      body: formData,
    })
    expect(res.status).toBe(400)
  })

  it('should reject description exceeding 1000 chars', async () => {
    const formData = new FormData()
    formData.append('title', 'Test Title')
    formData.append('description', 'a'.repeat(1001))
    formData.append(
      'file',
      new Blob(['{"type": "USER_INPUT", "content": "Hello"}']),
    )

    const res = await app.request('/api/conversations', {
      method: 'POST',
      headers: { Cookie: `access_token=${authToken}` },
      body: formData,
    })
    expect(res.status).toBe(400)
  })

  it('should list conversations via GET /api/conversations', async () => {
    if (!testUserId) return

    const res = await app.request('/api/conversations')
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.data.length).toBeGreaterThan(0)
    expect(data.pagination.total).toBeGreaterThan(0)
    expect(data.data[0].transcript).toBeUndefined() // Should not include full transcript
  })

  it('should search conversations', async () => {
    if (!testUserId) return

    const res = await app.request('/api/conversations?q=Test')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.length).toBeGreaterThan(0)
  })

  it('should get trending conversations', async () => {
    if (!testUserId) return

    const res = await app.request('/api/conversations/trending')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('should get a single conversation by ID', async () => {
    if (!testUserId || !conversationId) return

    const res = await app.request(`/api/conversations/${conversationId}`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.conversation.id).toBe(conversationId)
    expect(data.conversation.transcript).toBeDefined() // Should include full transcript
    expect(data.conversation.has_liked).toBe(false)
  })

  it('should get a single conversation by ID with has_liked true when liked', async () => {
    if (!testUserId || !conversationId) return

    await sql`
      INSERT INTO likes (user_id, conversation_id) VALUES (${testUserId}, ${conversationId})
    `

    const res = await app.request(`/api/conversations/${conversationId}`, {
      headers: {
        Cookie: `access_token=${authToken}`,
      },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.conversation.id).toBe(conversationId)
    expect(data.conversation.has_liked).toBe(true)
  })

  it("should prevent deleting someone else's conversation", async () => {
    if (!testUserId || !conversationId) return

    const res = await app.request(`/api/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: {
        Cookie: `access_token=${otherAuthToken}`,
      },
    })
    expect(res.status).toBe(403)
  })

  it('should delete conversation if author', async () => {
    if (!testUserId || !conversationId) return

    const res = await app.request(`/api/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: {
        Cookie: `access_token=${authToken}`,
      },
    })
    expect(res.status).toBe(204)
  })
})
