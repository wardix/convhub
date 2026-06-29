import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatTimeAgo } from './formatDate'

describe('formatTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats "just now"', () => {
    const now = new Date('2026-06-29T12:00:00Z')
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 30 * 1000).toISOString()
    expect(formatTimeAgo(date)).toBe('just now')
  })

  it('formats minutes', () => {
    const now = new Date('2026-06-29T12:00:00Z')
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    expect(formatTimeAgo(date)).toBe('5m ago')
  })

  it('formats hours', () => {
    const now = new Date('2026-06-29T12:00:00Z')
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
    expect(formatTimeAgo(date)).toBe('3h ago')
  })

  it('formats days', () => {
    const now = new Date('2026-06-29T12:00:00Z')
    vi.setSystemTime(now)

    const date = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatTimeAgo(date)).toBe('2d ago')
  })

  it('formats months', () => {
    const now = new Date('2026-06-29T12:00:00Z')
    vi.setSystemTime(now)

    const date = new Date(
      now.getTime() - 60 * 24 * 60 * 60 * 1000,
    ).toISOString() // ~60 days -> 2 months
    expect(formatTimeAgo(date)).toBe('2mo ago')
  })

  it('formats years', () => {
    const now = new Date('2026-06-29T12:00:00Z')
    vi.setSystemTime(now)

    const date = new Date(
      now.getTime() - 400 * 24 * 60 * 60 * 1000,
    ).toISOString() // > 365 days -> 1 year
    expect(formatTimeAgo(date)).toBe('1y ago')
  })
})
