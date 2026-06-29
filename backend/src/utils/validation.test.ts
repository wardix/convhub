import { describe, expect, it } from 'bun:test'
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from './validation.js'

describe('validation utils', () => {
  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true)
    })

    it('should reject incorrect emails', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@.com')).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('should validate passwords with 8 or more characters', () => {
      expect(validatePassword('password123').valid).toBe(true)
    })

    it('should reject passwords under 8 characters', () => {
      expect(validatePassword('short').valid).toBe(false)
    })
  })

  describe('validateUsername', () => {
    it('should validate alphanumeric usernames between 3 and 50 chars', () => {
      expect(validateUsername('user_name123').valid).toBe(true)
      expect(validateUsername('abc').valid).toBe(true)
    })

    it('should reject invalid usernames', () => {
      expect(validateUsername('ab').valid).toBe(false)
      expect(validateUsername('user name').valid).toBe(false)
      expect(validateUsername('user-name').valid).toBe(false)
    })
  })
})
