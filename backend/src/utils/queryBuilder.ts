export interface BuildQueryOptions {
  currentUserId?: string | null
  q?: string
  tag?: string
  authorId?: string
  id?: string
  trending?: boolean
  sort?: string
  limit?: number
  offset?: number
  includeTranscript?: boolean
}

export function buildConversationQuery(opts: BuildQueryOptions) {
  const args: string[] = []

  let query = `
    SELECT c.id, c.title, c.description, c.message_count, c.like_count, 
           c.comment_count, c.view_count, c.created_at, c.user_id`

  if (opts.includeTranscript) {
    query += ', c.transcript'
  }

  query += `,
           json_build_object('id', c.user_id, 'username', u.username, 'avatar_url', u.avatar_url) as author,
           COALESCE(json_agg(json_build_object('id', tg.id, 'name', tg.name, 'color', tg.color)) FILTER (WHERE tg.id IS NOT NULL), '[]') as tags`

  if (opts.currentUserId) {
    args.push(opts.currentUserId)
    query += `, EXISTS(SELECT 1 FROM likes l WHERE l.conversation_id = c.id AND l.user_id = $${args.length}) as "has_liked" `
  } else {
    query += `, false as "has_liked" `
  }

  query += `
    FROM conversations c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN conversation_tags ct ON c.id = ct.conversation_id
    LEFT JOIN tags tg ON ct.tag_id = tg.id
    WHERE 1=1
  `

  if (opts.id) {
    args.push(opts.id)
    query += ` AND c.id = $${args.length}`
  }

  if (opts.authorId) {
    args.push(opts.authorId)
    query += ` AND c.user_id = $${args.length}`
  }

  if (opts.q) {
    args.push(`%${opts.q}%`)
    query += ` AND (c.title ILIKE $${args.length} OR c.description ILIKE $${args.length})`
  }

  if (opts.tag) {
    args.push(opts.tag)
    query += ` AND EXISTS (
      SELECT 1 FROM conversation_tags ct2 
      JOIN tags t2 ON ct2.tag_id = t2.id 
      WHERE ct2.conversation_id = c.id AND t2.name = $${args.length}
    )`
  }

  if (opts.trending) {
    query += ` AND c.created_at >= NOW() - INTERVAL '7 days'`
  }

  query += ' GROUP BY c.id, u.id'

  let orderBy = ' ORDER BY c.created_at DESC'
  if (opts.trending) {
    orderBy =
      ' ORDER BY (c.like_count * 3 + c.comment_count * 2 + c.view_count) DESC, c.created_at DESC'
  } else if (opts.sort === 'popular') {
    orderBy = ' ORDER BY c.like_count DESC, c.created_at DESC'
  } else if (opts.sort === 'commented') {
    orderBy = ' ORDER BY c.comment_count DESC, c.created_at DESC'
  }

  const countQuery = `SELECT COUNT(*) FROM (${query}) AS subquery`

  query += orderBy

  if (opts.limit !== undefined) {
    query += ` LIMIT ${opts.limit}`
  }

  if (opts.offset !== undefined) {
    query += ` OFFSET ${opts.offset}`
  }

  return { query, countQuery, args }
}
