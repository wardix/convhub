import type {
  Comment,
  Conversation,
  ConversationDetail,
  Tag,
  User,
  UserProfile,
} from '../types'

// biome-ignore lint/suspicious/noExplicitAny: raw API response
export function mapUser(raw: any): User {
  return {
    id: raw.id,
    email: raw.email,
    username: raw.username,
    displayName: raw.display_name,
    avatarUrl: raw.avatar_url,
    bio: raw.bio,
    createdAt: raw.created_at,
  }
}

// biome-ignore lint/suspicious/noExplicitAny: raw API response
export function mapUserProfile(raw: any): UserProfile {
  return {
    ...mapUser(raw),
    followerCount: raw.follower_count || 0,
    followingCount: raw.following_count || 0,
    conversationCount: raw.conversation_count || 0,
    isFollowing: Boolean(raw.is_following),
  }
}

// biome-ignore lint/suspicious/noExplicitAny: raw API response
export function mapTag(raw: any): Tag {
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color,
    conversationCount: raw.conversation_count || 0,
  }
}

// biome-ignore lint/suspicious/noExplicitAny: raw API response
export function mapConversation(raw: any): Conversation {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    author: mapUser(raw.author),
    tags: raw.tags?.map(mapTag) || [],
    likeCount: raw.like_count || 0,
    commentCount: raw.comment_count || 0,
    messageCount: raw.message_count || 0,
    viewCount: raw.view_count || 0,
    hasLiked: Boolean(raw.has_liked),
    createdAt: raw.created_at,
  }
}

// biome-ignore lint/suspicious/noExplicitAny: raw API response
export function mapTranscriptEntry(raw: any): any {
  return {
    ...raw,
    stepIndex: raw.step_index,
    createdAt: raw.created_at,
    toolCalls: raw.tool_calls,
  }
}

// biome-ignore lint/suspicious/noExplicitAny: raw API response
export function mapConversationDetail(raw: any): ConversationDetail {
  return {
    ...mapConversation(raw),
    transcript: raw.transcript?.map(mapTranscriptEntry) || [],
  }
}

// biome-ignore lint/suspicious/noExplicitAny: raw API response
export function mapComment(raw: any): Comment {
  return {
    id: raw.id,
    content: raw.content,
    author: mapUser(raw.author),
    createdAt: raw.created_at,
  }
}
