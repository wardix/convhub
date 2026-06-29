import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../hooks/useAuth'
import { Navbar } from './Navbar'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({ theme: 'dark', toggleTheme: vi.fn() })),
}))

describe('Navbar', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      logout: vi.fn(),
    } as any)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('traps focus inside mobile menu when opened', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    )

    const menuBtn = screen.getByRole('button', {
      name: /Open menu|Toggle menu/i,
    })
    fireEvent.click(menuBtn)

    // Fast forward setTimeout that focuses the first element
    vi.advanceTimersByTime(20)

    const searchInput = screen.getByPlaceholderText(/Search conversations.../i)

    // First focus should be the input or something else focusable inside
    expect(document.activeElement).toBe(searchInput)

    // Let's get all focusable elements inside Navbar to test tab wrap
    // The query selector used in Navbar is:
    // 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const container = document.querySelector('header')
    expect(container).toBeInTheDocument()

    const focusable = container?.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    expect(focusable).toBeDefined()
    expect(focusable?.length).toBeGreaterThan(0)

    if (focusable && focusable.length > 0) {
      const firstElement = focusable[0] as HTMLElement
      const lastElement = focusable[focusable.length - 1] as HTMLElement

      // If active element is first, Shift+Tab should focus the last
      firstElement.focus()
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(lastElement)

      // If active element is last, Tab should focus the first
      lastElement.focus()
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: false })
      expect(document.activeElement).toBe(firstElement)
    }
  })

  it('closes mobile menu on Escape key', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    )

    const menuBtn = screen.getByRole('button', {
      name: /Open menu|Toggle menu/i,
    })
    fireEvent.click(menuBtn)

    expect(menuBtn).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(menuBtn).toHaveAttribute('aria-expanded', 'false')
  })
})
