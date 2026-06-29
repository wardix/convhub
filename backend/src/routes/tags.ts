import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { authOptional } from '../middleware/auth.js'

const tags = new Hono()

tags.get('/', async (c) => {
  try {
    const rows = await sql.unsafe(`
      SELECT t.id, t.name, t.color, COUNT(ct.conversation_id) as conversation_count
      FROM tags t
      LEFT JOIN conversation_tags ct ON t.id = ct.tag_id
      GROUP BY t.id
      ORDER BY conversation_count DESC, t.name ASC
    `)

    return c.json({ data: rows }, 200)
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

tags.get('/:name/conversations', authOptional, async (c) => {
  try {
    const tagName = c.req.param('name')
    const sort = c.req.query('sort') || 'recent'
    const page = Number.parseInt(c.req.query('page') || '1', 10)
    const limit = Number.parseInt(c.req.query('limit') || '10', 10)
    const offset = (page - 1) * limit
    const userId = c.get('userId')

    const args: string[] = [tagName]

    // Build the query
    let query = `
      SELECT c.id, c.title, c.description, c.message_count, c.like_count, 
             c.comment_count, c.view_count, c.created_at,
             u.username, u.avatar_url,
             COALESCE(json_agg(json_build_object('id', tg.id, 'name', tg.name, 'color', tg.color)) FILTER (WHERE tg.id IS NOT NULL), '[]') as tags
      `

    if (userId) {
      args.push(userId as string)
      query += `, EXISTS(SELECT 1 FROM likes l WHERE l.conversation_id = c.id AND l.user_id = $${args.length}) as "hasLiked" `
    } else {
      query += `, false as "hasLiked" `
    }

    query += `
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      JOIN conversation_tags ct_filter ON c.id = ct_filter.conversation_id
      JOIN tags t_filter ON ct_filter.tag_id = t_filter.id
      LEFT JOIN conversation_tags ct ON c.id = ct.conversation_id
      LEFT JOIN tags tg ON ct.tag_id = tg.id
      WHERE t_filter.name = $1
      GROUP BY c.id, u.id
    `

    if (sort === 'popular') {
      query += ' ORDER BY c.like_count DESC, c.created_at DESC'
    } else if (sort === 'commented') {
      query += ' ORDER BY c.comment_count DESC, c.created_at DESC'
    } else {
      query += ' ORDER BY c.created_at DESC'
    }

    // Get count first
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS subquery`
    const countRes = await sql.unsafe(countQuery, args)
    const total = Number.parseInt(countRes[0].count, 10)

    // Add pagination
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

export { tags }
