import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { authOptional, authRequired } from '../middleware/auth.js'

const follows = new Hono()

follows.post('/:id/follow', authRequired, async (c) => {
  try {
    const followingId = c.req.param('id')
    const followerId = c.get('userId')

    if (followingId === followerId) {
      return c.json({ error: 'Cannot follow yourself', status: 400 }, 400)
    }

    const [userToFollow] = await sql.unsafe(
      'SELECT id FROM users WHERE id = $1',
      [followingId],
    )
    if (!userToFollow) {
      return c.json({ error: 'User not found', status: 404 }, 404)
    }

    const [existing] = await sql.unsafe(
      'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId],
    )

    if (existing) {
      return c.json({ error: 'Already following', status: 409 }, 409)
    }

    await sql.unsafe(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
      [followerId, followingId],
    )

    return c.json({ success: true }, 200)
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

follows.delete('/:id/follow', authRequired, async (c) => {
  try {
    const followingId = c.req.param('id')
    const followerId = c.get('userId')

    const [existing] = await sql.unsafe(
      'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId],
    )

    if (!existing) {
      return c.json({ error: 'Not following', status: 404 }, 404)
    }

    await sql.unsafe(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId],
    )

    return new Response(null, { status: 204 })
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

follows.get('/:id/followers', authOptional, async (c) => {
  try {
    const userId = c.req.param('id')
    const currentUserId = c.get('userId')
    const page = Number.parseInt(c.req.query('page') || '1', 10)
    const limit = Number.parseInt(c.req.query('limit') || '20', 10)
    const offset = (page - 1) * limit

    const countRes = await sql.unsafe(
      'SELECT COUNT(*) FROM follows WHERE following_id = $1',
      [userId],
    )
    const total = Number.parseInt(countRes[0].count, 10)

    const args: string[] = [userId, limit.toString(), offset.toString()]
    let query = `
      SELECT u.id, u.username, u.display_name, u.avatar_url
    `
    if (currentUserId) {
      args.push(currentUserId as string)
      query += `, EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = $${args.length} AND f2.following_id = u.id) as "is_following"`
    } else {
      query += `, false as "is_following"`
    }

    query += `
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `

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

follows.get('/:id/following', authOptional, async (c) => {
  try {
    const userId = c.req.param('id')
    const currentUserId = c.get('userId')
    const page = Number.parseInt(c.req.query('page') || '1', 10)
    const limit = Number.parseInt(c.req.query('limit') || '20', 10)
    const offset = (page - 1) * limit

    const countRes = await sql.unsafe(
      'SELECT COUNT(*) FROM follows WHERE follower_id = $1',
      [userId],
    )
    const total = Number.parseInt(countRes[0].count, 10)

    const args: string[] = [userId, limit.toString(), offset.toString()]
    let query = `
      SELECT u.id, u.username, u.display_name, u.avatar_url
    `
    if (currentUserId) {
      args.push(currentUserId as string)
      query += `, EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = $${args.length} AND f2.following_id = u.id) as "is_following"`
    } else {
      query += `, false as "is_following"`
    }

    query += `
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `

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

export { follows }
