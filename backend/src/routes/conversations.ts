import { Hono } from 'hono'
import { sql } from '../db/connection.js'
import { authOptional, authRequired } from '../middleware/auth.js'
import type { TranscriptEntry } from '../types/index.js'
import { buildConversationQuery } from '../utils/queryBuilder.js'
import {
  countMessages,
  parseJsonl,
  validateTranscript,
} from '../utils/transcript.js'

const conversations = new Hono()

export const viewDebounceMap = new Map<string, number>()
export const VIEW_DEBOUNCE_MS = 60 * 60 * 1000 // 1 hour

// Periodically clean up the map to prevent memory leaks
const cleanupInterval = setInterval(
  () => {
    const now = Date.now()
    for (const [key, timestamp] of viewDebounceMap.entries()) {
      if (now - timestamp > VIEW_DEBOUNCE_MS) {
        viewDebounceMap.delete(key)
      }
    }
  },
  5 * 60 * 1000,
)

// Unref to prevent interval from keeping the event loop alive during testing
if (cleanupInterval.unref) cleanupInterval.unref()

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

    const { query, countQuery, args } = buildConversationQuery({
      currentUserId: userId as string | undefined,
      q,
      tag,
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
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

conversations.get('/trending', authOptional, async (c) => {
  try {
    const userId = c.get('userId')
    const limit = 10
    const { query, args } = buildConversationQuery({
      currentUserId: userId as string | undefined,
      trending: true,
      limit,
    })

    const rows = await sql.unsafe(query, args)
    return c.json({ data: rows }, 200)
  } catch (err) {
    console.error('TRENDING ERROR:', err)
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

conversations.get('/:id', authOptional, async (c) => {
  try {
    const id = c.req.param('id')
    const userId = c.get('userId')
    const { query, args } = buildConversationQuery({
      currentUserId: userId as string | undefined,
      id,
      includeTranscript: true,
    })

    const rows = await sql.unsafe(query, args)

    if (rows.length === 0) {
      return c.json({ error: 'Conversation not found', status: 404 }, 404)
    }

    const ip = c.req.header('x-forwarded-for') || 'unknown'
    const viewKey = `${ip}:${id}`
    const now = Date.now()
    const lastViewed = viewDebounceMap.get(viewKey)
    const isAuthor = rows[0].user_id === userId

    if (!isAuthor && (!lastViewed || now - lastViewed > VIEW_DEBOUNCE_MS)) {
      viewDebounceMap.set(viewKey, now)
      // Increment view count
      await sql`UPDATE conversations SET view_count = view_count + 1 WHERE id = ${id}`
      rows[0].view_count = (rows[0].view_count || 0) + 1
    }

    return c.json({ conversation: rows[0] }, 200)
  } catch (_err) {
    return c.json({ error: 'Internal server error', status: 500 }, 500)
  }
})

conversations.put('/:id', authRequired, async (c) => {
  try {
    const id = c.req.param('id')
    const userId = c.get('userId')
    const body = await c.req.json()
    const { title, description, tags } = body

    const [conversation] =
      await sql`SELECT user_id FROM conversations WHERE id = ${id}`

    if (!conversation) {
      return c.json({ error: 'Conversation not found', status: 404 }, 404)
    }

    if (conversation.user_id !== userId) {
      return c.json({ error: 'Unauthorized', status: 403 }, 403)
    }

    if (title !== undefined && title.length > 200) {
      return c.json(
        { error: 'Title cannot exceed 200 characters', status: 400 },
        400,
      )
    }

    if (description !== undefined && description.length > 1000) {
      return c.json(
        { error: 'Description cannot exceed 1000 characters', status: 400 },
        400,
      )
    }

    // Initialize update set with COALESCE to fallback to current values
    await sql`
      UPDATE conversations
      SET title = COALESCE(${title !== undefined ? title : null}, title),
          description = COALESCE(${description !== undefined ? description : null}, description)
      WHERE id = ${id}
    `

    if (tags !== undefined) {
      // Parse tags
      const tagList =
        typeof tags === 'string'
          ? tags
              .split(',')
              .map((t) => t.trim().toLowerCase())
              .filter((t) => t.length > 0)
              .slice(0, 5)
          : []

      // Delete existing tags
      await sql`DELETE FROM conversation_tags WHERE conversation_id = ${id}`

      if (tagList.length > 0) {
        // Insert new tags
        const tagsJoined = tagList.join(',')

        await sql`
          INSERT INTO tags (name)
          SELECT unnest(string_to_array(${tagsJoined}, ','))
          ON CONFLICT (name) DO NOTHING
        `

        await sql`
          INSERT INTO conversation_tags (conversation_id, tag_id)
          SELECT ${id}, id FROM tags WHERE name = ANY(string_to_array(${tagsJoined}, ','))
        `
      }
    }

    const [updated] = await sql`SELECT * FROM conversations WHERE id = ${id}`
    return c.json({ conversation: updated }, 200)
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
