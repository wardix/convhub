import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { ToastContainer } from '../components/ToastContainer/ToastContainer'
import { ToastProvider } from '../context/ToastContext'
import * as useAuthHook from '../hooks/useAuth'
import { ConversationPage } from './ConversationPage'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('ConversationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        displayName: null,
        avatarUrl: null,
        bio: null,
        createdAt: new Date().toISOString(),
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('renders loading state initially', () => {
    // Provide a promise that doesn't resolve immediately
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    render(
      <MemoryRouter initialEntries={['/conversations/123']}>
        <ToastProvider>
          <Routes>
            <Route path="/conversations/:id" element={<ConversationPage />} />
          </Routes>
          <ToastContainer />
        </ToastProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('transcript-skeleton')).toBeInTheDocument()
  })

  it('renders conversation data correctly', async () => {
    const mockConversation = {
      id: '123',
      title: 'Test Conversation',
      description: 'A test desc',
      author: {
        id: 'user-2',
        username: 'otheruser',
      },
      tags: [{ id: '1', name: 'react', color: '#61dafb' }],
      like_count: 42,
      comment_count: 0,
      message_count: 5,
      view_count: 100,
      has_liked: false,
      created_at: new Date().toISOString(),
      transcript: [],
    }

    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes('/comments')) {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve(mockConversation)
    })

    render(
      <MemoryRouter initialEntries={['/conversations/123']}>
        <ToastProvider>
          <Routes>
            <Route path="/conversations/:id" element={<ConversationPage />} />
          </Routes>
          <ToastContainer />
        </ToastProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Test Conversation')).toBeInTheDocument()
      expect(screen.getByText('otheruser')).toBeInTheDocument()
      expect(screen.getByText('A test desc')).toBeInTheDocument()
      expect(screen.getByText('#react')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument() // button text
    })
  })
})
