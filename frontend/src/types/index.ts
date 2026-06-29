export interface User {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  createdAt: string
}

export interface UserProfile extends User {
  followerCount: number
  followingCount: number
  conversationCount: number
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
  type:
    | 'USER_INPUT'
    | 'PLANNER_RESPONSE'
    | 'TOOL_CALL'
    | 'TOOL_RESPONSE'
    | 'CHECKPOINT'
    | 'CONVERSATION_HISTORY'
  status: 'DONE' | 'ERROR' | 'IN_PROGRESS'
  createdAt: string
  content?: string
  thinking?: string
  toolCalls?: unknown[]
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
