import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { ExplorePage } from './ExplorePage'

import { useAuth } from '../hooks/useAuth'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('ExplorePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
    } as any)
  })

  it('renders search bar, sort options and lists conversations', async () => {
    const mockConversations = {
      data: [
        {
          id: '1',
          title: 'First Conv',
          description: 'Desc 1',
          author: {
            id: 'u1',
            username: 'user1',
            email: '',
            display_name: null,
            avatar_url: null,
            bio: null,
            created_at: '',
          },
          tags: [{ id: 't1', name: 'react', color: '#61dafb' }],
          likeCount: 10,
          commentCount: 5,
          messageCount: 20,
          viewCount: 100,
          hasLiked: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Second Conv',
          description: 'Desc 2',
          author: {
            id: 'u2',
            username: 'user2',
            email: '',
            display_name: null,
            avatar_url: null,
            bio: null,
            created_at: '',
          },
          tags: [],
          likeCount: 5,
          commentCount: 2,
          messageCount: 10,
          viewCount: 50,
          hasLiked: false,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: {
        total: 2,
        page: 1,
        limit: 12,
        pages: 1,
      },
    }

    const mockTags = {
      data: [{ id: 't1', name: 'react', conversationCount: 10 }],
    }
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes('/tags')) return Promise.resolve(mockTags)
      if (url.includes('/conversations'))
        return Promise.resolve(mockConversations)
      return Promise.resolve([])
    })

    render(
      <MemoryRouter>
        <ExplorePage />
      </MemoryRouter>,
    )

    // Should render search bar
    expect(
      screen.getByPlaceholderText(
        'Search conversations by title, author, or content...',
      ),
    ).toBeInTheDocument()

    // Sort options
    expect(screen.getByText('🕒 Recent')).toBeInTheDocument()
    expect(screen.getByText('🔥 Most Popular')).toBeInTheDocument()

    // Wait for data
    expect(await screen.findByText('First Conv')).toBeInTheDocument()
    expect(screen.getByText('Second Conv')).toBeInTheDocument()
    expect(screen.getAllByText(/react/i)[0]).toBeInTheDocument()
  })

  it('renders empty state if no conversations found', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes('/tags')) return Promise.resolve({ data: [] })
      if (url.includes('/conversations'))
        return Promise.resolve({
          data: [],
          pagination: { total: 0, page: 1, limit: 12, pages: 0 },
        })
      return Promise.resolve([])
    })

    render(
      <MemoryRouter>
        <ExplorePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('No conversations found')).toBeInTheDocument()
    })
  })
})
