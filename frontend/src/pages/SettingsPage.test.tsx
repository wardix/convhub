import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import * as useAuthHook from '../hooks/useAuth'
import { SettingsPage } from './SettingsPage'

vi.mock('../api/client', () => ({
  api: {
    put: vi.fn(),
  },
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('SettingsPage', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    display_name: 'Test Name',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Test bio',
    created_at: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('renders settings page with user data pre-filled', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )

    expect(screen.getByDisplayValue('Test Name')).toBeInTheDocument()
    expect(
      screen.getByDisplayValue('https://example.com/avatar.jpg'),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test bio')).toBeInTheDocument()
    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
  })

  it('handles profile update successfully', async () => {
    vi.mocked(api.put).mockResolvedValue({ user: mockUser })

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )

    const nameInput = screen.getByLabelText(/Display Name/i)
    fireEvent.change(nameInput, { target: { value: 'New Name' } })

    const saveBtn = screen.getByText('Save Changes')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/users/me', {
        display_name: 'New Name',
        bio: 'Test bio',
        avatar_url: 'https://example.com/avatar.jpg',
      })
      expect(
        screen.getByText('Profile updated successfully'),
      ).toBeInTheDocument()
    })
  })

  it('shows error toast on update failure', async () => {
    vi.mocked(api.put).mockRejectedValue(new Error('Update failed'))

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )

    const saveBtn = screen.getByText('Save Changes')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText('Failed to update profile')).toBeInTheDocument()
    })
  })
})
