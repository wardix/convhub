import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { HomePage } from './HomePage'

import { useAuth } from '../hooks/useAuth'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
    } as any)
  })

  it('renders hero section correctly', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('Share Your AI Conversations with the World'),
    ).toBeInTheDocument()
    expect(screen.getByText('Upload a Conversation')).toBeInTheDocument()
    expect(screen.getByText('Browse Conversations')).toBeInTheDocument()
  })

  it('fetches and renders trending conversations, recent uploads and tags', async () => {
    const mockTrending = {
      data: [
        {
          id: '1',
          title: 'Trending Conv',
          author: {
            id: 'u1',
            username: 'user1',
            email: '',
            display_name: null,
            avatar_url: null,
            bio: null,
            created_at: '',
          },
          tags: [],
          likeCount: 10,
          commentCount: 5,
          messageCount: 20,
          viewCount: 100,
          hasLiked: false,
          createdAt: new Date().toISOString(),
        },
      ],
    }
    const mockRecent = {
      data: [
        {
          id: '2',
          title: 'Recent Conv',
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
    }
    const mockTags = {
      data: [{ id: 't1', name: 'react', conversationCount: 10 }],
    }
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes('trending')) return Promise.resolve(mockTrending)
      if (url.includes('sort=recent')) return Promise.resolve(mockRecent)
      if (url.includes('tags')) return Promise.resolve(mockTags)
      return Promise.resolve([])
    })

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Trending Conv')).toBeInTheDocument()
      expect(screen.getByText('Recent Conv')).toBeInTheDocument()
      expect(screen.getByText('#react')).toBeInTheDocument()
      expect(screen.getByText('(10)')).toBeInTheDocument()
    })
  })
})
