import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'

vi.mock('./api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('App', () => {
  it('renders without crashing', async () => {
    render(<App />)
    const logoText = await screen.findByText('ConvHub')
    expect(logoText).toBeInTheDocument()
  })
})
