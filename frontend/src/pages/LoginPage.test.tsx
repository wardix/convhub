import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '../api/client'
import { AuthContext } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import { LoginPage } from './LoginPage'

const { mockNavigate } = vi.hoisted(() => {
  return { mockNavigate: vi.fn() }
})

// Mock the API client
vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client')
  return {
    ...actual,
    api: {
      post: vi.fn(),
    },
  }
})

// Mock react-router-dom useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('LoginPage', () => {
  const mockLogin = vi.fn()

  const renderWithContext = (isAuthenticated = false) => {
    return render(
      <AuthContext.Provider
        value={{
          user: isAuthenticated
            ? {
                id: '1',
                email: 'test@example.com',
                username: 'testuser',
                displayName: null,
                avatarUrl: null,
                bio: null,
                createdAt: '',
              }
            : null,
          isLoading: false,
          isAuthenticated,
          login: mockLogin,
          updateUser: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <ToastProvider>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>,
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    renderWithContext()
    expect(
      screen.getByRole('heading', { name: /ConvHub/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Log in/i })).toBeInTheDocument()
  })

  it('redirects if already authenticated', () => {
    renderWithContext(true)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('shows validation errors for empty fields', async () => {
    renderWithContext()
    const submitBtn = screen.getByRole('button', { name: /Log in/i })

    fireEvent.click(submitBtn)

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows validation error for invalid email', async () => {
    renderWithContext()
    const emailInput = screen.getByLabelText(/Email/i)
    const submitBtn = screen.getByRole('button', { name: /Log in/i })

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitBtn)

    expect(await screen.findByText('Invalid email format')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('handles successful login', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: null,
      bio: null,
      created_at: '2023-01-01',
    }
    const expectedMappedUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
      bio: null,
      createdAt: '2023-01-01',
    }
    vi.mocked(api.post).mockResolvedValueOnce({ user: mockUser })

    renderWithContext()

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Log in/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      })
      expect(mockLogin).toHaveBeenCalledWith(expectedMappedUser)
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('displays API error message on failure', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiError(401, 'Invalid credentials'),
    )

    renderWithContext()

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'wrongpassword' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Log in/i }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })
})
