import { describe, expect, it } from 'vitest'
import {
  mapComment,
  mapConversation,
  mapConversationDetail,
  mapTag,
  mapUser,
  mapUserProfile,
} from './mappers'

describe('API Response Mappers', () => {
  it('mapUser should normalize user fields', () => {
    const raw = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'http://example.com/avatar.png',
      bio: 'Hello world',
      created_at: '2023-01-01',
    }
    const user = mapUser(raw)
    expect(user.displayName).toBe('Test User')
    expect(user.avatarUrl).toBe('http://example.com/avatar.png')
    expect(user.createdAt).toBe('2023-01-01')
    expect((user as any).display_name).toBeUndefined()
  })

  it('mapUserProfile should normalize profile fields', () => {
    const raw = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: null,
      bio: null,
      created_at: '2023-01-01',
      follower_count: 5,
      following_count: 10,
      conversation_count: 15,
      is_following: true,
    }
    const profile = mapUserProfile(raw)
    expect(profile.followerCount).toBe(5)
    expect(profile.followingCount).toBe(10)
    expect(profile.conversationCount).toBe(15)
    expect(profile.isFollowing).toBe(true)
  })

  it('mapTag should normalize tag fields', () => {
    const raw = {
      id: 't1',
      name: 'typescript',
      color: '#3178C6',
      conversation_count: 42,
    }
    const tag = mapTag(raw)
    expect(tag.conversationCount).toBe(42)
  })

  it('mapConversation should normalize conversation fields', () => {
    const raw = {
      id: 'c1',
      title: 'Test',
      description: 'Desc',
      author: {
        id: 'u1',
        email: 'test@test.com',
        username: 'u1',
        display_name: 'U1',
        created_at: '2023-01-01',
      },
      tags: [{ id: 't1', name: 'react', color: null, conversation_count: 1 }],
      like_count: 10,
      comment_count: 5,
      message_count: 20,
      view_count: 100,
      has_liked: false,
      created_at: '2023-01-01',
    }
    const conv = mapConversation(raw)
    expect(conv.likeCount).toBe(10)
    expect(conv.commentCount).toBe(5)
    expect(conv.messageCount).toBe(20)
    expect(conv.viewCount).toBe(100)
    expect(conv.hasLiked).toBe(false)
    expect(conv.author.displayName).toBe('U1')
    expect(conv.tags[0].conversationCount).toBe(1)
  })

  it('mapConversationDetail should normalize conversation and transcript', () => {
    const raw = {
      id: 'c1',
      title: 'Test',
      description: 'Desc',
      author: {
        id: 'u1',
        email: 'test@test.com',
        username: 'u1',
        created_at: '2023-01-01',
      },
      like_count: 10,
      created_at: '2023-01-01',
      transcript: [
        {
          step_index: 0,
          source: 'USER_EXPLICIT',
          type: 'USER_INPUT',
          status: 'DONE',
          created_at: '2023-01-01',
          content: 'Hello',
        },
      ],
    }
    const detail = mapConversationDetail(raw)
    expect(detail.transcript.length).toBe(1)
    expect(detail.transcript[0].stepIndex).toBe(0)
    expect(detail.transcript[0].createdAt).toBe('2023-01-01')
  })

  it('mapComment should normalize comment fields', () => {
    const raw = {
      id: 'com1',
      content: 'Great!',
      author: {
        id: 'u1',
        email: 'test@test.com',
        username: 'u1',
        display_name: 'U1',
        created_at: '2023-01-01',
      },
      created_at: '2023-01-01',
    }
    const comment = mapComment(raw)
    expect(comment.author.displayName).toBe('U1')
    expect(comment.createdAt).toBe('2023-01-01')
  })
})
