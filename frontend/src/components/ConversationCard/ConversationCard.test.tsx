import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../hooks/useAuth'
import { ConversationCard } from './ConversationCard'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('ConversationCard', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
    } as any)
  })

  const mockConversation = {
    id: 'conv-123',
    title: 'How to build a web app',
    description: 'A detailed conversation about building a web app with React.',
    author: {
      id: 'user-1',
      username: 'johndoe',
      email: 'john@example.com',
      display_name: 'John Doe',
      avatar_url: null,
      bio: null,
      created_at: new Date().toISOString(),
    },
    tags: [
      { id: 'tag-1', name: 'react', color: '#61dafb' },
      { id: 'tag-2', name: 'web', color: null },
    ],
    likeCount: 42,
    commentCount: 5,
    messageCount: 12,
    viewCount: 1337,
    hasLiked: false,
    createdAt: new Date().toISOString(),
  }

  it('renders conversation details correctly', () => {
    render(
      <MemoryRouter>
        <ConversationCard conversation={mockConversation} />
      </MemoryRouter>,
    )

    expect(screen.getByText('How to build a web app')).toBeInTheDocument()
    expect(screen.getByText(/A detailed conversation/)).toBeInTheDocument()
    expect(screen.getByText('johndoe')).toBeInTheDocument()
    expect(screen.getByText('#react')).toBeInTheDocument()
    expect(screen.getByText('#web')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument() // Likes
    expect(screen.getByText('💬 5')).toBeInTheDocument() // Comments
    expect(screen.getByText('👁️ 1337')).toBeInTheDocument() // Views
    expect(screen.getByText('📝 12')).toBeInTheDocument() // Messages
  })

  it('calls onLikeToggle when like button is clicked', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'test' },
      isAuthenticated: true,
    } as any)
    const onLikeToggle = vi.fn()
    render(
      <MemoryRouter>
        <ConversationCard
          conversation={mockConversation}
          onLikeToggle={onLikeToggle}
        />
      </MemoryRouter>,
    )

    const likeButton = screen.getByRole('button', { name: /like/i })
    fireEvent.click(likeButton)
    expect(onLikeToggle).toHaveBeenCalledWith('conv-123', false)
  })
})
