import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../hooks/useAuth'
import { FollowButton } from './FollowButton'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

describe('FollowButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Follow" when not following', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'currentUser' } } as any)

    render(
      <MemoryRouter>
        <FollowButton
          userId="otherUser"
          isFollowing={false}
          onFollowChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Follow')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders "Following" when following and "Unfollow" on hover', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'currentUser' } } as any)

    render(
      <MemoryRouter>
        <FollowButton
          userId="otherUser"
          isFollowing={true}
          onFollowChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    const btn = screen.getByRole('button')
    expect(btn).toHaveTextContent('Following')
    expect(btn).toHaveAttribute('aria-pressed', 'true')

    fireEvent.mouseEnter(btn)
    expect(btn).toHaveTextContent('Unfollow')

    fireEvent.mouseLeave(btn)
    expect(btn).toHaveTextContent('Following')
  })

  it('does not render if userId is current user', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'currentUser' } } as any)

    render(
      <MemoryRouter>
        <FollowButton
          userId="currentUser"
          isFollowing={false}
          onFollowChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('redirects to login if unauthenticated user clicks', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any)
    const mockNavigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    const onFollowChange = vi.fn()

    render(
      <MemoryRouter>
        <FollowButton
          userId="otherUser"
          isFollowing={false}
          onFollowChange={onFollowChange}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button'))

    expect(mockNavigate).toHaveBeenCalledWith('/login')
    expect(onFollowChange).not.toHaveBeenCalled()
  })

  it('updates optimistically and calls onFollowChange when clicked', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'currentUser' } } as any)
    const onFollowChange = vi.fn().mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <FollowButton
          userId="otherUser"
          isFollowing={false}
          onFollowChange={onFollowChange}
        />
      </MemoryRouter>,
    )

    const btn = screen.getByRole('button')
    fireEvent.click(btn)

    // Optimistic update
    expect(btn).toHaveTextContent('Following')
    expect(btn).toHaveAttribute('aria-pressed', 'true')

    // API call
    expect(onFollowChange).toHaveBeenCalledWith('otherUser', true)
  })
})
