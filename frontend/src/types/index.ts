export interface User {
  id: string
  email: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export interface UserProfile extends User {
  follower_count: number
  following_count: number
  conversation_count: number
  isFollowing: boolean
}

export interface Conversation {
  id: string
  title: string
  description: string
  author: User
  tags: Tag[]
  likeCount: number
  commentCount: number
  messageCount: number
  viewCount: number
  hasLiked: boolean
  createdAt: string
}

export interface ConversationDetail extends Conversation {
  transcript: TranscriptEntry[]
}

export interface TranscriptEntry {
  stepIndex: number
  source: 'USER_EXPLICIT' | 'MODEL' | 'SYSTEM'
  type: 'USER_INPUT' | 'PLANNER_RESPONSE' | 'TOOL_CALL' | 'TOOL_RESPONSE'
  status: 'DONE' | 'ERROR' | 'IN_PROGRESS'
  createdAt: string
  content?: string
  thinking?: string
  tool_calls?: unknown[]
}

export interface Comment {
  id: string
  content: string
  author: User
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  color: string | null
  conversationCount?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}
