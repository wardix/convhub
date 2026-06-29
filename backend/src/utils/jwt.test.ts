import { describe, expect, it } from 'bun:test'
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwt.js'

describe('jwt utils', () => {
  it('should sign and verify access token', async () => {
    const userId = 'user-123'
    const token = await signAccessToken(userId)
    expect(typeof token).toBe('string')

    const payload = await verifyAccessToken(token)
    expect(payload.sub).toBe(userId)
    expect(payload.exp).toBeDefined()
    expect(payload.iat).toBeDefined()
  })

  it('should sign and verify refresh token', async () => {
    const userId = 'user-456'
    const token = await signRefreshToken(userId)
    expect(typeof token).toBe('string')

    const payload = await verifyRefreshToken(token)
    expect(payload.sub).toBe(userId)
  })

  it('should throw on invalid token', async () => {
    try {
      await verifyAccessToken('invalid.token.here')
      expect(true).toBe(false) // Should not reach here
    } catch (e) {
      expect(e).toBeDefined()
    }
  })
})
