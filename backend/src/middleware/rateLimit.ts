import type { Context, Next } from 'hono'

interface RateLimitOptions {
  limit: number
  windowMs: number
}

interface RateLimitInfo {
  count: number
  resetTime: number
}

// In-memory store
const store = new Map<string, RateLimitInfo>()

// Cleanup interval to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, info] of store.entries()) {
    if (now > info.resetTime) {
      store.delete(key)
    }
  }
}, 60000)

export const rateLimit = (options: RateLimitOptions) => {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header('x-forwarded-for') ||
      c.req.header('cf-connecting-ip') ||
      '127.0.0.1'

    // Use path as part of the key so limits are per-route
    const key = `${ip}:${c.req.path}`
    const now = Date.now()

    let info = store.get(key)

    if (!info || now > info.resetTime) {
      info = {
        count: 0,
        resetTime: now + options.windowMs,
      }
    }

    info.count++
    store.set(key, info)

    const remaining = Math.max(0, options.limit - info.count)
    const resetSec = Math.ceil((info.resetTime - now) / 1000)

    c.header('X-RateLimit-Limit', options.limit.toString())
    c.header('X-RateLimit-Remaining', remaining.toString())
    c.header('X-RateLimit-Reset', resetSec.toString())

    if (info.count > options.limit) {
      c.header('Retry-After', resetSec.toString())
      return c.json(
        { error: 'Too many requests, please try again later.', status: 429 },
        429,
      )
    }

    await next()
  }
}
