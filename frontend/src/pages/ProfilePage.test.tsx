import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import * as useAuthHook from '../hooks/useAuth'
import { ProfilePage } from './ProfilePage'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('ProfilePage', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    display_name: 'Test User',
    avatar_url: null,
    bio: 'Hello world',
    created_at: new Date().toISOString(),
  }

  const mockProfile = {
    ...mockUser,
    follower_count: 5,
    following_count: 3,
    conversation_count: 10,
    isFollowing: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: { ...mockUser, id: 'user-2', username: 'otheruser' }, // different user to show Follow button
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('renders loading state initially', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter initialEntries={['/profile/testuser']}>
        <Routes>
          <Route path="/profile/:username" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading profile...')).toBeInTheDocument()
  })

  it('renders 404 when user not found', async () => {
    vi.mocked(api.get).mockRejectedValue({ status: 404, message: 'Not found' })
    render(
      <MemoryRouter initialEntries={['/profile/testuser']}>
        <Routes>
          <Route path="/profile/:username" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument()
    })
  })

  it('renders profile data and default conversations tab', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes('/conversations')) {
        return Promise.resolve({ data: [], pagination: { pages: 1 } })
      }
      return Promise.resolve({ user: mockProfile })
    })

    render(
      <MemoryRouter initialEntries={['/profile/testuser']}>
        <Routes>
          <Route path="/profile/:username" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('@testuser')).toBeInTheDocument()
      expect(screen.getByText('Hello world')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument() // conversations count
      expect(screen.getByText('5')).toBeInTheDocument() // followers count
      expect(
        screen.getByText('No conversations shared yet.'),
      ).toBeInTheDocument()
    })
  })

  it('shows Edit Profile button for own profile', async () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: mockUser, // Same as profile author
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes('/conversations')) {
        return Promise.resolve({ data: [], pagination: { pages: 1 } })
      }
      return Promise.resolve({ user: mockProfile })
    })

    render(
      <MemoryRouter initialEntries={['/profile/testuser']}>
        <Routes>
          <Route path="/profile/:username" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument()
    })
  })

  it('can switch to followers tab', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes('/conversations')) {
        return Promise.resolve({ data: [], pagination: { pages: 1 } })
      }
      if (url.includes('/followers')) {
        return Promise.resolve({ data: [], pagination: { pages: 1 } })
      }
      return Promise.resolve({ user: mockProfile })
    })

    render(
      <MemoryRouter initialEntries={['/profile/testuser']}>
        <Routes>
          <Route path="/profile/:username" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Followers').length).toBeGreaterThan(0)
    })

    const followersTabBtn = screen.getAllByText('Followers')[1] // The tab, not the stat label
    fireEvent.click(followersTabBtn)

    await waitFor(() => {
      expect(screen.getByText('No followers yet.')).toBeInTheDocument()
    })
  })
})
