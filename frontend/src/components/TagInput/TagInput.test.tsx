import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TagInput } from './TagInput'

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual('../../api/client')
  return {
    ...actual,
    api: {
      get: vi.fn(),
    },
  }
})

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}))

describe('TagInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders correctly with initial tags', () => {
    const mockTags = [{ id: '1', name: 'react', color: '#111' }]
    const mockOnChange = vi.fn()

    render(<TagInput value={mockTags} onChange={mockOnChange} />)

    expect(screen.getByText(/#react/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Add tags/i)).toBeInTheDocument()
  })

  it('allows adding a new tag by pressing enter', async () => {
    const mockOnChange = vi.fn()
    render(<TagInput value={[]} onChange={mockOnChange} />)

    const input = screen.getByPlaceholderText(/Add tags/i)
    fireEvent.change(input, { target: { value: 'newtag' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockOnChange).toHaveBeenCalledTimes(1)
    const newTags = mockOnChange.mock.calls[0][0]
    expect(newTags).toHaveLength(1)
    expect(newTags[0].name).toBe('newtag')
    expect(newTags[0].id).toMatch(/^temp-/)
  })

  it('allows removing a tag', () => {
    const mockTags = [{ id: '1', name: 'react', color: '#111' }]
    const mockOnChange = vi.fn()

    render(<TagInput value={mockTags} onChange={mockOnChange} />)

    const removeBtn = screen.getByRole('button', { name: /Remove tag react/i })
    fireEvent.click(removeBtn)

    expect(mockOnChange).toHaveBeenCalledWith([])
  })

  it('disables input when max tags reached', () => {
    const mockTags = [
      { id: '1', name: 't1', color: '#111' },
      { id: '2', name: 't2', color: '#111' },
    ]
    const mockOnChange = vi.fn()

    render(<TagInput value={mockTags} onChange={mockOnChange} maxTags={2} />)

    const input = screen.getByPlaceholderText(/Max 2 tags reached/i)
    expect(input).toBeDisabled()
  })

  it('removes last tag on backspace when input is empty', () => {
    const mockTags = [
      { id: '1', name: 't1', color: '#111' },
      { id: '2', name: 't2', color: '#111' },
    ]
    const mockOnChange = vi.fn()

    render(<TagInput value={mockTags} onChange={mockOnChange} />)

    const input = screen.getByPlaceholderText(/Add tags/i)
    fireEvent.keyDown(input, { key: 'Backspace' })

    expect(mockOnChange).toHaveBeenCalledWith([mockTags[0]])
  })

  it('allows navigating suggestions with arrow keys', async () => {
    const { api } = await import('../../api/client')
    vi.mocked(api.get).mockResolvedValue({
      data: [
        { id: '1', name: 'react', count: 10 },
        { id: '2', name: 'redux', count: 5 },
      ],
    })

    const mockOnChange = vi.fn()
    render(<TagInput value={[]} onChange={mockOnChange} />)

    const input = screen.getByPlaceholderText(/Add tags/i)
    fireEvent.change(input, { target: { value: 're' } })

    // Fast-forward debounce
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    // Check if react is rendered
    expect(screen.getByText(/#react/i)).toBeInTheDocument()

    // Arrow down selects first option
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const reactBtn = screen.getByText(/#react/i).closest('button')
    expect(reactBtn).toHaveClass(/selected/i)

    // Arrow down selects second option
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const reduxBtn = screen.getByText(/#redux/i).closest('button')
    expect(reduxBtn).toHaveClass(/selected/i)

    // Arrow down selects create option
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const createBtn = screen.getByText(/Create tag/i).closest('button')
    expect(createBtn).toHaveClass(/selected/i)

    // Arrow up goes back to second option
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(screen.getByText(/#redux/i).closest('button')).toHaveClass(
      /selected/i,
    )

    // Enter selects the current option
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mockOnChange).toHaveBeenCalledTimes(1)
    expect(mockOnChange.mock.calls[0][0][0].name).toBe('redux')
  })
})
