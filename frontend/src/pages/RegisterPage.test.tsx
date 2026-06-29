import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '../api/client'
import { AuthContext } from '../context/AuthContext'
import { RegisterPage } from './RegisterPage'

const { mockNavigate } = vi.hoisted(() => {
  return { mockNavigate: vi.fn() }
})

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client')
  return {
    ...actual,
    api: {
      post: vi.fn(),
    },
  }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('RegisterPage', () => {
  const mockRegister = vi.fn()

  const renderWithContext = (isAuthenticated = false) => {
    return render(
      <AuthContext.Provider
        value={{
          user: isAuthenticated
            ? {
                id: '1',
                email: 'test@example.com',
                username: 'testuser',
                display_name: null,
                avatar_url: null,
                bio: null,
                created_at: '',
              }
            : null,
          isLoading: false,
          isAuthenticated,
          login: vi.fn(),
          register: mockRegister,
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders register form', () => {
    renderWithContext()
    expect(
      screen.getByRole('heading', { name: /ConvHub/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Create account/i }),
    ).toBeInTheDocument()
  })

  it('redirects if already authenticated', () => {
    renderWithContext(true)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('shows validation errors for empty fields', async () => {
    renderWithContext()
    const submitBtn = screen.getByRole('button', { name: /Create account/i })

    fireEvent.click(submitBtn)

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Username is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows validation errors for invalid formats', async () => {
    renderWithContext()
    const submitBtn = screen.getByRole('button', { name: /Create account/i })

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'invalid' },
    })
    fireEvent.change(screen.getByLabelText(/Username/i), {
      target: { value: 'a' },
    }) // too short
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'short' },
    }) // too short
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'different' },
    })

    fireEvent.click(submitBtn)

    expect(await screen.findByText('Invalid email format')).toBeInTheDocument()
    expect(
      screen.getByText('Username must be 3-50 characters'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Password must be at least 8 characters'),
    ).toBeInTheDocument()
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()

    expect(api.post).not.toHaveBeenCalled()
  })

  it('handles successful registration', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
    }
    vi.mocked(api.post).mockResolvedValueOnce({ user: mockUser })

    renderWithContext()

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/Username/i), {
      target: { value: 'testuser' },
    })
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Create account/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        email: 'test@example.com',
        username: 'testuser',
        display_name: null,
        password: 'password123',
      })
      expect(mockRegister).toHaveBeenCalledWith(mockUser)
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('displays API error message on failure', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiError(409, 'Email already taken'),
    )

    renderWithContext()

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/Username/i), {
      target: { value: 'testuser' },
    })
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Create account/i }))

    expect(await screen.findByText('Email already taken')).toBeInTheDocument()
    expect(mockRegister).not.toHaveBeenCalled()
  })
})
