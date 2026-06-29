import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { authOptional, authRequired } from '../middleware/auth.js'

const conversationComments = new Hono()
const comments = new Hono()

conversationComments.get('/:id/comments', authOptional, async (c) => {
  try {
    const conversationId = c.req.param('id')
    const page = Number.parseInt(c.req.query('page') || '1', 10)
    const limit = Number.parseInt(c.req.query('limit') || '20', 10)
    const offset = (page - 1) * limit

    const [conversation] = await sql.unsafe(
      'SELECT id FROM conversations WHERE id = $1',
      [conversationId],
    )
    if (!conversation) {
      return c.json({ error: 'Conversation not found', status: 404 }, 404)
    }

    const countRes = await sql.unsafe(
      'SELECT COUNT(*) FROM comments WHERE conversation_id = $1',
      [conversationId],
    )
    const total = Number.parseInt(countRes[0].count, 10)

    const rows = await sql.unsafe(
      `
      SELECT c.id, c.content, c.created_at, u.username, u.display_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.conversation_id = $1
      ORDER BY c.created_at ASC
      LIMIT $2 OFFSET $3
      `,
      [conversationId, limit, offset],
    )

    return c.json(
      {
        data: rows,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      200,
    )
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

conversationComments.post('/:id/comments', authRequired, async (c) => {
  try {
    const conversationId = c.req.param('id')
    const userId = c.get('userId')
    const body = await c.req.json().catch(() => ({}))
    const content = body.content as string

    if (!content || content.trim().length === 0) {
      return c.json({ error: 'Content is required', status: 400 }, 400)
    }
    if (content.length > 2000) {
      return c.json({ error: 'Content too long (max 2000)', status: 400 }, 400)
    }

    const [conversation] = await sql.unsafe(
      'SELECT id FROM conversations WHERE id = $1',
      [conversationId],
    )
    if (!conversation) {
      return c.json({ error: 'Conversation not found', status: 404 }, 404)
    }

    const [comment] = await sql.unsafe(
      `
      INSERT INTO comments (conversation_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, content, created_at
      `,
      [conversationId, userId, content.trim()],
    )

    await sql.unsafe(
      'UPDATE conversations SET comment_count = comment_count + 1 WHERE id = $1',
      [conversationId],
    )

    const [user] = await sql.unsafe(
      'SELECT username, display_name, avatar_url FROM users WHERE id = $1',
      [userId],
    )

    return c.json(
      {
        comment: {
          ...comment,
          ...user,
        },
      },
      201,
    )
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

comments.delete('/:id', authRequired, async (c) => {
  try {
    const commentId = c.req.param('id')
    const userId = c.get('userId')

    const [comment] = await sql.unsafe(
      'SELECT user_id, conversation_id FROM comments WHERE id = $1',
      [commentId],
    )

    if (!comment) {
      return c.json({ error: 'Comment not found', status: 404 }, 404)
    }

    if (comment.user_id !== userId) {
      return c.json({ error: 'Forbidden', status: 403 }, 403)
    }

    await sql.unsafe('DELETE FROM comments WHERE id = $1', [commentId])
    await sql.unsafe(
      'UPDATE conversations SET comment_count = comment_count - 1 WHERE id = $1',
      [comment.conversation_id],
    )

    return new Response(null, { status: 204 })
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

export { conversationComments, comments }
