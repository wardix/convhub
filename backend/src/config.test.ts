import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

describe('config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset process.env and clear module cache to re-evaluate config.ts
    process.env = { ...originalEnv }
    delete require.cache[require.resolve('./config.js')]
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should not throw in development mode if secrets are missing', async () => {
    process.env.NODE_ENV = 'development'
    process.env.JWT_SECRET = ''
    process.env.JWT_REFRESH_SECRET = ''

    const { config } = await import('./config.js')
    expect(config.JWT_SECRET).toBe('secret')
    expect(config.JWT_REFRESH_SECRET).toBe('refresh_secret')
  })

  it('should throw in production if JWT_SECRET is missing', async () => {
    process.env.NODE_ENV = 'production'
    process.env.JWT_SECRET = ''
    process.env.JWT_REFRESH_SECRET = 'some-secret'

    expect(async () => {
      await import('./config.js')
    }).toThrow('JWT_SECRET is required in production')
  })

  it('should throw in production if JWT_REFRESH_SECRET is missing', async () => {
    process.env.NODE_ENV = 'production'
    process.env.JWT_SECRET = 'some-secret'
    process.env.JWT_REFRESH_SECRET = ''

    expect(async () => {
      await import('./config.js')
    }).toThrow('JWT_REFRESH_SECRET is required in production')
  })

  it('should use provided secrets in production', async () => {
    process.env.NODE_ENV = 'production'
    process.env.JWT_SECRET = 'prod-secret'
    process.env.JWT_REFRESH_SECRET = 'prod-refresh-secret'

    const { config } = await import('./config.js')
    expect(config.JWT_SECRET).toBe('prod-secret')
    expect(config.JWT_REFRESH_SECRET).toBe('prod-refresh-secret')
  })
})
