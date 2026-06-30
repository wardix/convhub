import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { $ } from 'bun'
import { sql } from '../db/connection.js'

describe('create-user script', () => {
  beforeAll(async () => {
    try {
      await sql`TRUNCATE TABLE users CASCADE`
    } catch (_e) {
      console.warn('Could not truncate users table')
    }
  })

  afterAll(async () => {
    try {
      await sql`TRUNCATE TABLE users CASCADE`
    } catch (_e) {
      console.warn('Could not truncate users table')
    }
  })

  it('should create a user successfully', async () => {
    const { stdout, exitCode } =
      await $`bun run src/scripts/create-user.ts --email scriptuser@example.com --username scriptuser --password securepass123`
        .nothrow()
        .quiet()
    expect(exitCode).toBe(0)
    expect(stdout.toString()).toContain('Successfully created user')

    const [user] =
      await sql`SELECT email, username FROM users WHERE email = 'scriptuser@example.com'`
    expect(user).toBeDefined()
    expect(user.username).toBe('scriptuser')
  })

  it('should fail with invalid email', async () => {
    const { stderr, exitCode } =
      await $`bun run src/scripts/create-user.ts --email invalid --username test2 --password securepass123`
        .nothrow()
        .quiet()
    expect(exitCode).toBe(1)
    expect(stderr.toString()).toContain('Invalid email format')
  })

  it('should fail with missing arguments', async () => {
    const { stderr, exitCode } =
      await $`bun run src/scripts/create-user.ts --email test@example.com`
        .nothrow()
        .quiet()
    expect(exitCode).toBe(1)
    expect(stderr.toString()).toContain('Usage: bun run create-user')
  })

  it('should fail if email already exists', async () => {
    const { stderr, exitCode } =
      await $`bun run src/scripts/create-user.ts --email scriptuser@example.com --username anotheruser --password securepass123`
        .nothrow()
        .quiet()
    expect(exitCode).toBe(1)
    expect(stderr.toString()).toContain('Email or username already exists')
  })
})
