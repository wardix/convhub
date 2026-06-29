import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { ExplorePage } from './ExplorePage'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}))

describe('ExplorePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search bar, sort options and lists conversations', async () => {
    const mockConversations = {
      data: [
        {
          id: '1',
          title: 'First Conv',
          author: { username: 'user1' },
          tags: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Second Conv',
          author: { username: 'user2' },
          tags: [],
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

    const mockTags = [{ id: 't1', name: 'react', conversationCount: 10 }]

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
    await waitFor(() => {
      expect(screen.getByText('First Conv')).toBeInTheDocument()
      expect(screen.getByText('Second Conv')).toBeInTheDocument()
      expect(screen.getByText('#react')).toBeInTheDocument()
    })
  })

  it('renders empty state if no conversations found', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes('/tags')) return Promise.resolve([])
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
