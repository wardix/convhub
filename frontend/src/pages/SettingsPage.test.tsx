import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { ToastContainer } from '../components/ToastContainer/ToastContainer'
import { ToastProvider } from '../context/ToastContext'
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
    displayName: 'Test Name',
    avatarUrl: 'https://example.com/avatar.jpg',
    bio: 'Test bio',
    createdAt: new Date().toISOString(),
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
      updateUser: vi.fn(),
    })
  })

  it('renders settings page with user data pre-filled', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <SettingsPage />
          <ToastContainer />
        </ToastProvider>
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
        <ToastProvider>
          <SettingsPage />
          <ToastContainer />
        </ToastProvider>
      </MemoryRouter>,
    )

    const nameInput = screen.getByLabelText(/Display Name/i)
    fireEvent.change(nameInput, { target: { value: 'New Name' } })

    const saveBtn = screen.getByText('Save Changes')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/users/me', {
        displayName: 'New Name',
        bio: 'Test bio',
        avatarUrl: 'https://example.com/avatar.jpg',
      })
      expect(
        screen.getByText('Profile updated successfully'),
      ).toBeInTheDocument()

      const authContext = vi.mocked(useAuthHook.useAuth).mock.results[0].value
      expect(authContext.updateUser).toHaveBeenCalledWith({
        displayName: 'New Name',
        bio: 'Test bio',
        avatarUrl: 'https://example.com/avatar.jpg',
      })
    })
  })

  it('shows error toast on update failure', async () => {
    vi.mocked(api.put).mockRejectedValue(new Error('Update failed'))

    render(
      <MemoryRouter>
        <ToastProvider>
          <SettingsPage />
          <ToastContainer />
        </ToastProvider>
      </MemoryRouter>,
    )

    const saveBtn = screen.getByText('Save Changes')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText('Failed to update profile')).toBeInTheDocument()
    })
  })
})
