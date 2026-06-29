import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { CommentSection } from './CommentSection'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('CommentSection', () => {
  const mockComments = {
    data: [
      {
        id: 'c1',
        content: 'This is a great conversation!',
        author: {
          id: 'user2',
          username: 'alice',
          displayName: null,
          email: 'alice@example.com',
          avatarUrl: null,
          bio: null,
          createdAt: '',
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'c2',
        content: 'I agree',
        author: {
          id: 'currentUser',
          username: 'bob',
          displayName: null,
          email: 'bob@example.com',
          avatarUrl: null,
          bio: null,
          createdAt: '',
        },
        createdAt: new Date().toISOString(),
      },
    ],
    pagination: {
      total: 2,
      page: 1,
      limit: 20,
      pages: 1,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login prompt when not authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
    } as any)
    vi.mocked(api.get).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 20, pages: 1 },
    })

    render(
      <MemoryRouter>
        <CommentSection conversationId="conv1" />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Please/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/No comments yet/)).toBeInTheDocument()
    })
  })

  it('renders comments and input when authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'currentUser' },
      isAuthenticated: true,
    } as any)
    vi.mocked(api.get).mockResolvedValue(mockComments)

    render(
      <MemoryRouter>
        <CommentSection conversationId="conv1" />
      </MemoryRouter>,
    )

    // Form should be rendered
    expect(
      screen.getByPlaceholderText('Write a comment...'),
    ).toBeInTheDocument()

    // Wait for comments to load
    await waitFor(() => {
      expect(
        screen.getByText('This is a great conversation!'),
      ).toBeInTheDocument()
      expect(screen.getByText('I agree')).toBeInTheDocument()
    })

    // Check if delete button is rendered only for author's comment
    const deleteBtns = screen.getAllByRole('button', { name: /delete/i })
    expect(deleteBtns).toHaveLength(1)
  })

  it('allows posting a new comment', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'currentUser' },
      isAuthenticated: true,
    } as any)
    vi.mocked(api.get).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 20, pages: 1 },
    })
    vi.mocked(api.post).mockResolvedValue({
      comment: {
        id: 'c3',
        content: 'New comment text',
        author: { id: 'currentUser', username: 'bob' },
        createdAt: new Date().toISOString(),
      },
    })

    render(
      <MemoryRouter>
        <CommentSection conversationId="conv1" />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/No comments yet/)).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('Write a comment...')
    fireEvent.change(textarea, { target: { value: 'New comment text' } })

    const postBtn = screen.getByRole('button', { name: /post comment/i })
    fireEvent.click(postBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/conversations/conv1/comments', {
        content: 'New comment text',
      })
      expect(screen.getByText('New comment text')).toBeInTheDocument()
      expect(textarea).toHaveValue('')
    })
  })

  it('allows deleting own comment', async () => {
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true)

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'currentUser' },
      isAuthenticated: true,
    } as any)
    vi.mocked(api.get).mockResolvedValue(mockComments)
    vi.mocked(api.delete).mockResolvedValue(null)

    render(
      <MemoryRouter>
        <CommentSection conversationId="conv1" />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('I agree')).toBeInTheDocument()
    })

    const deleteBtn = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/comments/c2')
      expect(screen.queryByText('I agree')).not.toBeInTheDocument()
    })
  })

  it('handles load more functionality', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'currentUser' },
      isAuthenticated: true,
    } as any)

    // First page with hasMore = true
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: [mockComments.data[0]],
        pagination: { total: 2, page: 1, limit: 1, pages: 2 },
      })
      .mockResolvedValueOnce({
        data: [mockComments.data[1]],
        pagination: { total: 2, page: 2, limit: 1, pages: 2 },
      })

    render(
      <MemoryRouter>
        <CommentSection conversationId="conv1" />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByText('This is a great conversation!'),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /load more comments/i }),
      ).toBeInTheDocument()
    })

    const loadMoreBtn = screen.getByRole('button', {
      name: /load more comments/i,
    })
    fireEvent.click(loadMoreBtn)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/conversations/conv1/comments?page=2&limit=20',
      )
      expect(screen.getByText('I agree')).toBeInTheDocument()
      // Button should disappear since pages=2 and page=2
      expect(
        screen.queryByRole('button', { name: /load more comments/i }),
      ).not.toBeInTheDocument()
    })
  })
})
