import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { authOptional } from '../middleware/auth.js'
import { buildConversationQuery } from '../utils/queryBuilder.js'

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

    const { query, countQuery, args } = buildConversationQuery({
      currentUserId: userId as string | undefined,
      tag: tagName,
      sort,
      limit,
      offset,
    })

    // Get count first
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

export { tags }
