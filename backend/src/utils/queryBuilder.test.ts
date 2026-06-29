import { describe, expect, it } from 'bun:test'
import { buildConversationQuery } from './queryBuilder.js'

describe('buildConversationQuery', () => {
  it('builds a basic query', () => {
    const { query, countQuery, args } = buildConversationQuery({})
    expect(query).toContain('SELECT c.id')
    expect(query).toContain('FROM conversations c')
    expect(query).toContain('false as "has_liked"')
    expect(countQuery).toContain('SELECT COUNT(*) FROM (')
    expect(args).toHaveLength(0)
  })

  it('includes currentUserId for has_liked', () => {
    const { query, args } = buildConversationQuery({ currentUserId: 'user1' })
    expect(query).toContain(
      'EXISTS(SELECT 1 FROM likes l WHERE l.conversation_id = c.id AND l.user_id = $1) as "has_liked"',
    )
    expect(args).toEqual(['user1'])
  })

  it('applies search filter', () => {
    const { query, args } = buildConversationQuery({ q: 'react' })
    expect(query).toContain('(c.title ILIKE $1 OR c.description ILIKE $1)')
    expect(args).toEqual(['%react%'])
  })

  it('applies tag filter', () => {
    const { query, args } = buildConversationQuery({ tag: 'javascript' })
    expect(query).toContain('AND EXISTS (')
    expect(query).toContain('t2.name = $1')
    expect(args).toEqual(['javascript'])
  })

  it('applies author filter', () => {
    const { query, args } = buildConversationQuery({ authorId: 'user1' })
    expect(query).toContain('c.user_id = $1')
    expect(args).toEqual(['user1'])
  })

  it('applies pagination and sorting', () => {
    const { query, countQuery } = buildConversationQuery({
      limit: 10,
      offset: 20,
      sort: 'popular',
    })
    expect(query).toContain('ORDER BY c.like_count DESC, c.created_at DESC')
    expect(query).toContain('LIMIT 10')
    expect(query).toContain('OFFSET 20')

    // count query should not have limit or offset or order by
    expect(countQuery).not.toContain('LIMIT')
    expect(countQuery).not.toContain('ORDER BY')
  })

  it('handles trending query', () => {
    const { query } = buildConversationQuery({ trending: true })
    expect(query).toContain("c.created_at >= NOW() - INTERVAL '7 days'")
    expect(query).toContain(
      'ORDER BY (c.like_count * 3 + c.comment_count * 2 + c.view_count) DESC, c.created_at DESC',
    )
  })
})
