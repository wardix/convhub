import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchBar } from './SearchBar'

describe('SearchBar', () => {
  it('renders correctly with default props', () => {
    render(<SearchBar onSearch={() => {}} />)
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('renders correctly with custom placeholder and initial value', () => {
    render(
      <SearchBar
        onSearch={() => {}}
        placeholder="Search conversations"
        initialValue="react"
      />,
    )
    expect(screen.getByDisplayValue('react')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Search conversations'),
    ).toBeInTheDocument()
  })

  it('debounces the search callback', async () => {
    const onSearch = vi.fn()
    render(<SearchBar onSearch={onSearch} debounceMs={300} />)

    const input = screen.getByPlaceholderText('Search...')

    // Type rapidly
    fireEvent.change(input, { target: { value: 'r' } })
    fireEvent.change(input, { target: { value: 're' } })
    fireEvent.change(input, { target: { value: 'rea' } })

    // Should not be called immediately
    expect(onSearch).not.toHaveBeenCalled()

    // Wait for debounce
    await waitFor(
      () => {
        expect(onSearch).toHaveBeenCalledWith('rea')
      },
      { timeout: 500 },
    )

    // Should only be called once
    expect(onSearch).toHaveBeenCalledTimes(1)
  })

  it('clears the input when clear button is clicked', () => {
    const onSearch = vi.fn()
    render(<SearchBar onSearch={onSearch} initialValue="something" />)

    const input = screen.getByDisplayValue('something')
    const clearBtn = screen.getByRole('button', { name: /clear/i })

    fireEvent.click(clearBtn)

    expect(input).toHaveValue('')
    // Clear should immediately trigger search with empty string (or after debounce)
    expect(onSearch).toHaveBeenCalledWith('')
  })
})
