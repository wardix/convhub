import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test'
import { Hono } from 'hono'
import { rateLimit } from './rateLimit.js'

describe('rateLimit middleware', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should allow requests under the limit', async () => {
    const app = new Hono()
    app.use('/test', rateLimit({ limit: 5, windowMs: 60000 }))
    app.get('/test', (c) => c.text('ok'))

    for (let i = 0; i < 5; i++) {
      const res = await app.request('/test', {
        headers: { 'X-Forwarded-For': '127.0.0.1' },
      })
      expect(res.status).toBe(200)
      expect(res.headers.get('X-RateLimit-Limit')).toBe('5')
      expect(res.headers.get('X-RateLimit-Remaining')).toBe((4 - i).toString())
    }
  })

  it('should block the 6th request within window', async () => {
    const app = new Hono()
    app.use('/test', rateLimit({ limit: 5, windowMs: 60000 }))
    app.get('/test', (c) => c.text('ok'))

    for (let i = 0; i < 5; i++) {
      await app.request('/test', {
        headers: { 'X-Forwarded-For': '192.168.1.1' },
      })
    }

    const res = await app.request('/test', {
      headers: { 'X-Forwarded-For': '192.168.1.1' },
    })

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeTruthy()
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
    const data = await res.json()
    expect(data.error).toBe('Too many requests, please try again later.')
  })

  it('should allow requests after window expires', async () => {
    const app = new Hono()
    app.use('/test', rateLimit({ limit: 2, windowMs: 60000 }))
    app.get('/test', (c) => c.text('ok'))

    await app.request('/test', { headers: { 'X-Forwarded-For': '10.0.0.1' } })
    await app.request('/test', { headers: { 'X-Forwarded-For': '10.0.0.1' } })

    const blockedRes = await app.request('/test', {
      headers: { 'X-Forwarded-For': '10.0.0.1' },
    })
    expect(blockedRes.status).toBe(429)

    // Advance time by 61 seconds
    vi.advanceTimersByTime(61000)

    const allowedRes = await app.request('/test', {
      headers: { 'X-Forwarded-For': '10.0.0.1' },
    })
    expect(allowedRes.status).toBe(200)
    expect(allowedRes.headers.get('X-RateLimit-Remaining')).toBe('1')
  })
})
