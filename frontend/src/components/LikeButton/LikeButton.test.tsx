import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../hooks/useAuth'
import { LikeButton } from './LikeButton'

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

describe('LikeButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with correct count and unliked state', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: '1' } } as any)

    render(
      <MemoryRouter>
        <LikeButton
          conversationId="1"
          likeCount={42}
          hasLiked={false}
          onLikeChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('🤍')).toBeInTheDocument()
  })

  it('renders with liked state', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: '1' } } as any)

    render(
      <MemoryRouter>
        <LikeButton
          conversationId="1"
          likeCount={10}
          hasLiked={true}
          onLikeChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('❤️')).toBeInTheDocument()
  })

  it('redirects to login if unauthenticated user clicks', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any)
    const mockNavigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    const onLikeChange = vi.fn()

    render(
      <MemoryRouter>
        <LikeButton
          conversationId="1"
          likeCount={0}
          hasLiked={false}
          onLikeChange={onLikeChange}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button'))

    expect(mockNavigate).toHaveBeenCalledWith('/login')
    expect(onLikeChange).not.toHaveBeenCalled()
  })

  it('updates optimistically and calls onLikeChange when clicked', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: '1' } } as any)
    const onLikeChange = vi.fn().mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <LikeButton
          conversationId="1"
          likeCount={5}
          hasLiked={false}
          onLikeChange={onLikeChange}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button'))

    // Optimistic update
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('❤️')).toBeInTheDocument()

    // API call
    expect(onLikeChange).toHaveBeenCalledWith('1', true)
  })
})
