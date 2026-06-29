import { describe, expect, it } from 'bun:test'
import { hashPassword, verifyPassword } from './password.js'

describe('password utils', () => {
  it('should hash and verify password correctly', async () => {
    const password = 'mysecretpassword123'
    const hash = await hashPassword(password)

    expect(hash).not.toBe(password)
    expect(typeof hash).toBe('string')

    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)

    const isInvalid = await verifyPassword('wrongpassword', hash)
    expect(isInvalid).toBe(false)
  })
})
