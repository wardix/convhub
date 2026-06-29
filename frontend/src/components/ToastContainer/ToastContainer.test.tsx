import { act, fireEvent, render, screen } from '@testing-library/react'
import { useContext, useEffect, useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ToastContext, ToastProvider } from '../../context/ToastContext'
import { ToastContainer } from './ToastContainer'

const TestComponent = ({
  message,
  type,
}: { message: string; type: 'success' | 'error' | 'info' | 'warning' }) => {
  const context = useContext(ToastContext)
  const mounted = useRef(false)

  useEffect(() => {
    if (context && !mounted.current) {
      context.showToast(message, type)
      mounted.current = true
    }
  }, [context, message, type])

  return null
}

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a toast and auto-dismisses after 4 seconds', () => {
    render(
      <ToastProvider>
        <ToastContainer />
        <TestComponent message="Test success!" type="success" />
      </ToastProvider>,
    )

    expect(screen.getByText('Test success!')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.queryByText('Test success!')).not.toBeInTheDocument()
  })

  it('can be manually dismissed', async () => {
    render(
      <ToastProvider>
        <ToastContainer />
        <TestComponent message="Close me!" type="error" />
      </ToastProvider>,
    )

    expect(screen.getByText('Close me!')).toBeInTheDocument()

    const closeBtn = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeBtn)

    expect(screen.queryByText('Close me!')).not.toBeInTheDocument()
  })
})
