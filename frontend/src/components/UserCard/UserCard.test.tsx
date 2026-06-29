import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../hooks/useAuth'
import { UserCard } from './UserCard'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('UserCard', () => {
  const mockUser = {
    id: 'user-1',
    username: 'johndoe',
    email: 'john@example.com',
    display_name: 'John Doe',
    avatar_url: null,
    bio: 'Software engineer and AI enthusiast',
    created_at: new Date().toISOString(),
  }

  it('renders user details correctly', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any)

    render(
      <MemoryRouter>
        <UserCard user={mockUser} />
      </MemoryRouter>,
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('@johndoe')).toBeInTheDocument()
    expect(screen.getByText(/Software engineer/)).toBeInTheDocument()
    expect(screen.getByText('J')).toBeInTheDocument() // Avatar initial
  })

  it('renders FollowButton if onFollowChange is provided', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'other-user' } } as any)

    render(
      <MemoryRouter>
        <UserCard
          user={mockUser}
          isFollowing={false}
          onFollowChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: /follow/i })).toBeInTheDocument()
  })

  it('does not render FollowButton if onFollowChange is not provided', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'other-user' } } as any)

    render(
      <MemoryRouter>
        <UserCard user={mockUser} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
