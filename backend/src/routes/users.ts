import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { authOptional, authRequired } from '../middleware/auth.js'

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
    const page = Number.parseInt(c.req.query('page') || '1', 10)
    const limit = Number.parseInt(c.req.query('limit') || '10', 10)
    const offset = (page - 1) * limit
    const currentUserId = c.get('userId')

    const [user] = await sql.unsafe(
      'SELECT id FROM users WHERE username = $1',
      [username],
    )
    if (!user) {
      return c.json({ error: 'User not found', status: 404 }, 404)
    }

    const args: string[] = [user.id]

    let query = `
      SELECT c.id, c.title, c.description, c.message_count, c.like_count, 
             c.comment_count, c.view_count, c.created_at,
             json_build_object('id', c.user_id, 'username', u.username, 'avatar_url', u.avatar_url) as author,
             COALESCE(json_agg(json_build_object('id', tg.id, 'name', tg.name, 'color', tg.color)) FILTER (WHERE tg.id IS NOT NULL), '[]') as tags
    `

    if (currentUserId) {
      args.push(currentUserId as string)
      query += `, EXISTS(SELECT 1 FROM likes l WHERE l.conversation_id = c.id AND l.user_id = $${args.length}) as "has_liked" `
    } else {
      query += `, false as "has_liked" `
    }

    query += `
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN conversation_tags ct ON c.id = ct.conversation_id
      LEFT JOIN tags tg ON ct.tag_id = tg.id
      WHERE c.user_id = $1
      GROUP BY c.id, u.id
    `

    if (sort === 'popular') {
      query += ' ORDER BY c.like_count DESC, c.created_at DESC'
    } else if (sort === 'commented') {
      query += ' ORDER BY c.comment_count DESC, c.created_at DESC'
    } else {
      query += ' ORDER BY c.created_at DESC'
    }

    const countRes = await sql.unsafe(
      `SELECT COUNT(*) FROM (${query}) AS subquery`,
      args,
    )
    const total = Number.parseInt(countRes[0].count, 10)

    query += ` LIMIT $${args.length + 1} OFFSET $${args.length + 2}`
    args.push(limit.toString())
    args.push(offset.toString())

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
      args.push(body.display_name)
      updates.push(`display_name = $${args.length}`)
    }
    if (body.bio !== undefined) {
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

export { users }
