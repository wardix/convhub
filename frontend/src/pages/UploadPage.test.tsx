import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../context/AuthContext'
import { UploadPage } from './UploadPage'

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('UploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderWithContext = (isAuthenticated = false, isLoading = false) => {
    return render(
      <AuthContext.Provider
        value={{
          user: isAuthenticated
            ? {
                id: '1',
                email: 'test@test.com',
                username: 'test',
                display_name: null,
                avatar_url: null,
                bio: null,
                created_at: '',
              }
            : null,
          isLoading,
          isAuthenticated,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <UploadPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    )
  }

  it('redirects to login if not authenticated', () => {
    renderWithContext(false, false)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('does not redirect if loading', () => {
    renderWithContext(false, true)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('renders upload form if authenticated', () => {
    renderWithContext(true, false)
    expect(screen.getByText('Upload Conversation')).toBeInTheDocument()
    expect(
      screen.getByText(/Share your interesting AI interactions/),
    ).toBeInTheDocument()
    expect(screen.getByText('Upload JSONL Transcript')).toBeInTheDocument()
  })
})
