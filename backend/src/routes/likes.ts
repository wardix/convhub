import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { authRequired } from '../middleware/auth.js'

const likes = new Hono()

likes.post('/:id/like', authRequired, async (c) => {
  try {
    const conversationId = c.req.param('id')
    const userId = c.get('userId')
    const args = [userId, conversationId]

    // Check if conversation exists
    const [conversation] = await sql.unsafe(
      'SELECT id FROM conversations WHERE id = $1',
      [conversationId],
    )
    if (!conversation) {
      return c.json({ error: 'Conversation not found', status: 404 }, 404)
    }

    // Check if already liked
    const [existing] = await sql.unsafe(
      'SELECT 1 FROM likes WHERE user_id = $1 AND conversation_id = $2',
      args,
    )
    if (existing) {
      return c.json({ error: 'Already liked', status: 409 }, 409)
    }

    // Insert like and update count

    await sql.unsafe(
      'INSERT INTO likes (user_id, conversation_id) VALUES ($1, $2)',
      args,
    )
    const [updated] = await sql.unsafe(
      'UPDATE conversations SET like_count = like_count + 1 WHERE id = $1 RETURNING like_count',
      [conversationId],
    )

    return c.json({ like_count: updated.like_count }, 200)
  } catch (_err: unknown) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

likes.delete('/:id/like', authRequired, async (c) => {
  try {
    const conversationId = c.req.param('id')
    const userId = c.get('userId')
    const args = [userId, conversationId]

    // Check if liked
    const [existing] = await sql.unsafe(
      'SELECT 1 FROM likes WHERE user_id = $1 AND conversation_id = $2',
      args,
    )
    if (!existing) {
      return c.json({ error: 'Not liked', status: 404 }, 404)
    }

    // Delete like and update count

    await sql.unsafe(
      'DELETE FROM likes WHERE user_id = $1 AND conversation_id = $2',
      args,
    )
    const [updated] = await sql.unsafe(
      'UPDATE conversations SET like_count = like_count - 1 WHERE id = $1 RETURNING like_count',
      [conversationId],
    )

    return c.json({ like_count: updated.like_count }, 200)
  } catch (_err: unknown) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

export { likes }
