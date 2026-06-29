import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { authOptional, authRequired } from '../middleware/auth.js'
import { buildConversationQuery } from '../utils/queryBuilder.js'

const users = new Hono()

users.get('/:username', authOptional, async (c) => {
  try {
    const username = c.req.param('username')
    const currentUserId = c.get('userId')

    const [user] = await sql.unsafe(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.created_at,
              (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count,
              (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
              (SELECT COUNT(*) FROM conversations WHERE user_id = u.id) as conversation_count
       FROM users u WHERE u.username = $1`,
      [username],
    )

    if (!user) {
      return c.json({ error: 'User not found', status: 404 }, 404)
    }

    let is_following = false
    if (currentUserId) {
      const [follow] = await sql.unsafe(
        'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
        [currentUserId, user.id],
      )
      if (follow) is_following = true
    }

    return c.json({ user: { ...user, is_following } }, 200)
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

users.get('/:username/conversations', authOptional, async (c) => {
  try {
    const username = c.req.param('username')
    const sort = c.req.query('sort') || 'recent'
    const pageRaw = Number.parseInt(c.req.query('page') || '1', 10)
    const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw
    const limitRaw = Number.parseInt(c.req.query('limit') || '10', 10)
    const limit =
      Number.isNaN(limitRaw) || limitRaw < 1 ? 10 : Math.min(limitRaw, 100)
    const offset = (page - 1) * limit
    const currentUserId = c.get('userId')

    const [user] = await sql.unsafe(
      'SELECT id FROM users WHERE username = $1',
      [username],
    )
    if (!user) {
      return c.json({ error: 'User not found', status: 404 }, 404)
    }

    const { query, countQuery, args } = buildConversationQuery({
      currentUserId: currentUserId as string | undefined,
      authorId: user.id,
      sort,
      limit,
      offset,
    })

    const countRes = await sql.unsafe(countQuery, args)
    const total = Number.parseInt(countRes[0].count, 10)

    const rows = await sql.unsafe(query, args)

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

users.put('/me', authRequired, async (c) => {
  try {
    const userId = c.get('userId')
    const body = await c.req.json().catch(() => ({}))

    const updates: string[] = []
    const args: string[] = []

    if (body.display_name !== undefined) {
      if (
        typeof body.display_name === 'string' &&
        body.display_name.length > 100
      ) {
        return c.json(
          { error: 'Display name cannot exceed 100 characters', status: 400 },
          400,
        )
      }
      args.push(body.display_name)
      updates.push(`display_name = $${args.length}`)
    }
    if (body.bio !== undefined) {
      if (typeof body.bio === 'string' && body.bio.length > 250) {
        return c.json(
          { error: 'Bio cannot exceed 250 characters', status: 400 },
          400,
        )
      }
      args.push(body.bio)
      updates.push(`bio = $${args.length}`)
    }
    if (body.avatar_url !== undefined) {
      args.push(body.avatar_url)
      updates.push(`avatar_url = $${args.length}`)
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update', status: 400 }, 400)
    }

    args.push(userId)
    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${args.length}
      RETURNING id, username, display_name, avatar_url, bio
    `

    const [updatedUser] = await sql.unsafe(query, args)

    return c.json({ user: updatedUser }, 200)
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})
users.delete('/me', authRequired, async (c) => {
  try {
    const userId = c.get('userId')
    await sql.unsafe('DELETE FROM users WHERE id = $1', [userId])
    return c.json({ message: 'Account deleted successfully' }, 200)
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

export { users }
