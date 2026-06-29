import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { tags } from './tags.js'

const app = new Hono()
app.route('/api/tags', tags)

describe('tags routes', () => {
  beforeAll(async () => {
    try {
      await sql`TRUNCATE TABLE users, conversations, tags, conversation_tags CASCADE`

      const [u1] = await sql`
        INSERT INTO users (email, username, display_name) VALUES ('taguser@example.com', 'taguser', 'Tag User') RETURNING id
      `

      const [c1] = await sql`
        INSERT INTO conversations (user_id, title, description, transcript)
        VALUES (${u1.id}, 'Tag Conv 1', 'Desc', '[]')
        RETURNING id
      `

      const [c2] = await sql`
        INSERT INTO conversations (user_id, title, description, transcript)
        VALUES (${u1.id}, 'Tag Conv 2', 'Desc', '[]')
        RETURNING id
      `

      const [t1] =
        await sql`INSERT INTO tags (name) VALUES ('bun') RETURNING id`
      const [t2] =
        await sql`INSERT INTO tags (name) VALUES ('hono') RETURNING id`

      await sql`INSERT INTO conversation_tags (conversation_id, tag_id) VALUES (${c1.id}, ${t1.id})`
      await sql`INSERT INTO conversation_tags (conversation_id, tag_id) VALUES (${c1.id}, ${t2.id})`
      await sql`INSERT INTO conversation_tags (conversation_id, tag_id) VALUES (${c2.id}, ${t1.id})`
    } catch (_e) {
      console.warn('Could not setup db')
    }
  })

  afterAll(async () => {
    try {
      await sql`TRUNCATE TABLE users CASCADE`
    } catch (_e) {}
  })

  it('should list tags ordered by count', async () => {
    const res = await app.request('/api/tags')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.length).toBeGreaterThan(0)
    // bun has 2, hono has 1
    expect(data.data[0].name).toBe('bun')
    expect(Number.parseInt(data.data[0].conversation_count, 10)).toBe(2)
  })

  it('should list conversations by tag name', async () => {
    const res = await app.request('/api/tags/bun/conversations')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.length).toBe(2)
    expect(data.pagination.total).toBe(2)
  })
})
