import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { authOptional, authRequired } from '../middleware/auth.js'
import type { TranscriptEntry } from '../types/index.js'
import {
  countMessages,
  parseJsonl,
  validateTranscript,
} from '../utils/transcript.js'

const conversations = new Hono()

conversations.post('/', authRequired, async (c) => {
  try {
    const userId = c.get('userId')
    const body = await c.req.parseBody()

    const file = body.file as File
    const title = body.title as string
    const description = (body.description as string) || ''
    const tagsStr = (body.tags as string) || ''

    if (!file || !title) {
      return c.json({ error: 'File and title are required', status: 400 }, 400)
    }

    if (title.length > 200) {
      return c.json(
        { error: 'Title cannot exceed 200 characters', status: 400 },
        400,
      )
    }

    if (description.length > 1000) {
      return c.json(
        { error: 'Description cannot exceed 1000 characters', status: 400 },
        400,
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: 'File too large (max 10MB)', status: 400 }, 400)
    }

    const content = await file.text()
    let entries: TranscriptEntry[]
    try {
      entries = parseJsonl(content)
    } catch {
      return c.json({ error: 'Invalid JSONL format', status: 400 }, 400)
    }

    const validation = validateTranscript(entries)
    if (!validation.valid) {
      return c.json({ error: validation.error, status: 400 }, 400)
    }

    const messageCount = countMessages(entries)

    // Insert conversation
    const [conversation] = await sql`
      INSERT INTO conversations (user_id, title, description, transcript, message_count)
      VALUES (${userId}, ${title}, ${description}, ${JSON.stringify(entries)}, ${messageCount})
      RETURNING id, user_id, title, description, message_count, like_count, comment_count, view_count, created_at
    `

    // Process tags
    if (tagsStr) {
      const tagNames = Array.from(
        new Set(
          tagsStr
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t),
        ),
      )

      if (tagNames.length > 0) {
        const tagNamesStr = tagNames.join(',')
        // Find or create tags in bulk
        await sql`
          INSERT INTO tags (name)
          SELECT unnest(string_to_array(${tagNamesStr}, ','))
          ON CONFLICT (name) DO NOTHING
        `

        const tags = await sql`
          SELECT id FROM tags WHERE name = ANY(string_to_array(${tagNamesStr}, ','))
        `

        const tagIds = tags.map((t) => t.id)
        if (tagIds.length > 0) {
          const tagIdsStr = tagIds.join(',')
          await sql`
            INSERT INTO conversation_tags (conversation_id, tag_id)
            SELECT ${conversation.id}, unnest(string_to_array(${tagIdsStr}, ',')::uuid[])
          `
        }
      }
    }

    return c.json({ conversation }, 201)
  } catch (err) {
    console.error('Error in POST /api/conversations:', err)
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

conversations.get('/', authOptional, async (c) => {
  try {
    const q = c.req.query('q') || ''
    const tag = c.req.query('tag') || ''
    const sort = c.req.query('sort') || 'recent'
    const pageRaw = Number.parseInt(c.req.query('page') || '1', 10)
    const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw
    const limitRaw = Number.parseInt(c.req.query('limit') || '10', 10)
    const limit =
      Number.isNaN(limitRaw) || limitRaw < 1 ? 10 : Math.min(limitRaw, 100)
    const offset = (page - 1) * limit
    const userId = c.get('userId')

    const args: string[] = []

    // Build the query
    let query = `
      SELECT c.id, c.title, c.description, c.message_count, c.like_count, 
             c.comment_count, c.view_count, c.created_at,
             json_build_object('id', c.user_id, 'username', u.username, 'avatar_url', u.avatar_url) as author,
             COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
      `

    if (userId) {
      args.push(userId as string)
      query += `, EXISTS(SELECT 1 FROM likes l WHERE l.conversation_id = c.id AND l.user_id = $${args.length}) as "has_liked" `
    } else {
      query += `, false as "has_liked" `
    }

    query += `
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN conversation_tags ct ON c.id = ct.conversation_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE 1=1
    `

    if (q) {
      args.push(`%${q}%`)
      query += ` AND (c.title ILIKE $${args.length} OR c.description ILIKE $${args.length})`
    }
    if (tag) {
      args.push(tag)
      query += ` AND EXISTS (
        SELECT 1 FROM conversation_tags ct2 
        JOIN tags t2 ON ct2.tag_id = t2.id 
        WHERE ct2.conversation_id = c.id AND t2.name = $${args.length}
      )`
    }

    query += ' GROUP BY c.id, u.id'

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
    query += ` LIMIT ${limit} OFFSET ${offset}`

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
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

conversations.get('/trending', authOptional, async (c) => {
  try {
    const userId = c.get('userId')
    const limit = 10
    const args: string[] = []

    let query = `
      SELECT c.id, c.title, c.description, c.message_count, c.like_count, 
             c.comment_count, c.view_count, c.created_at,
             json_build_object('id', c.user_id, 'username', u.username, 'avatar_url', u.avatar_url) as author,
             COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
    `

    if (userId) {
      args.push(userId as string)
      query += `, EXISTS(SELECT 1 FROM likes l WHERE l.conversation_id = c.id AND l.user_id = $${args.length}) as "has_liked" `
    } else {
      query += `, false as "has_liked" `
    }

    query += `
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN conversation_tags ct ON c.id = ct.conversation_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY c.id, u.id
      ORDER BY (c.like_count * 3 + c.comment_count * 2 + c.view_count) DESC, c.created_at DESC
      LIMIT ${limit}
    `

    const rows = await sql.unsafe(query, args)
    return c.json({ data: rows }, 200)
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

conversations.get('/:id', authOptional, async (c) => {
  try {
    const id = c.req.param('id')
    const userId = c.get('userId')
    const args: string[] = []

    let query = `
      SELECT c.*,
             json_build_object('id', c.user_id, 'username', u.username, 'avatar_url', u.avatar_url) as author,
             COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
    `

    if (userId) {
      args.push(userId as string)
      query += `, EXISTS(SELECT 1 FROM likes l WHERE l.conversation_id = c.id AND l.user_id = $${args.length}) as "has_liked" `
    } else {
      query += `, false as "has_liked" `
    }

    args.push(id)

    query += `
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN conversation_tags ct ON c.id = ct.conversation_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.id = $${args.length}
      GROUP BY c.id, u.id
    `

    const rows = await sql.unsafe(query, args)

    if (rows.length === 0) {
      return c.json({ error: 'Conversation not found', status: 404 }, 404)
    }

    // Increment view count
    await sql`UPDATE conversations SET view_count = view_count + 1 WHERE id = ${id}`

    return c.json({ conversation: rows[0] }, 200)
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

conversations.delete('/:id', authRequired, async (c) => {
  try {
    const id = c.req.param('id')
    const userId = c.get('userId')

    const [conversation] =
      await sql`SELECT user_id FROM conversations WHERE id = ${id}`

    if (!conversation) {
      return c.json({ error: 'Conversation not found', status: 404 }, 404)
    }

    if (conversation.user_id !== userId) {
      return c.json({ error: 'Forbidden: not the author', status: 403 }, 403)
    }

    await sql`DELETE FROM conversations WHERE id = ${id}`

    return new Response(null, { status: 204 })
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

export { conversations }
