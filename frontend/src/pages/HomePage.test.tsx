import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { HomePage } from './HomePage'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders hero section correctly', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes('tags') || url.includes('trending'))
        return Promise.resolve([])
      return Promise.resolve({ data: [] })
    })

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
    const mockTrending = [
      {
        id: '1',
        title: 'Trending Conv',
        author: { username: 'user1' },
        tags: [],
        createdAt: new Date().toISOString(),
      },
    ]
    const mockRecent = {
      data: [
        {
          id: '2',
          title: 'Recent Conv',
          author: { username: 'user2' },
          tags: [],
          createdAt: new Date().toISOString(),
        },
      ],
    }
    const mockTags = [{ id: 't1', name: 'react', conversationCount: 10 }]

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
