import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { $ } from 'bun'
import { sql } from '../db/connection.js'
import { hashPassword } from '../utils/password.js'

describe('delete-user script', () => {
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

  async function seedUser(username: string) {
    const email = `${username}@example.com`
    const hashed = await hashPassword('password123')
    const [user] = await sql`
      INSERT INTO users (email, username, password_hash)
      VALUES (${email}, ${username}, ${hashed})
      RETURNING id, email, username
    `
    return user
  }

  it('should delete a user by email successfully with --confirm', async () => {
    const user = await seedUser('deltest1')

    const { stdout, exitCode } =
      await $`bun run src/scripts/delete-user.ts --email ${user.email} --confirm`
        .nothrow()
        .quiet()

    expect(exitCode).toBe(0)
    expect(stdout.toString()).toContain('User deleted successfully')

    const [deleted] = await sql`SELECT id FROM users WHERE id = ${user.id}`
    expect(deleted).toBeUndefined()
  })

  it('should delete a user by username successfully with --confirm', async () => {
    const user = await seedUser('deltest2')

    const { stdout, exitCode } =
      await $`bun run src/scripts/delete-user.ts --username ${user.username} --confirm`
        .nothrow()
        .quiet()

    expect(exitCode).toBe(0)
    expect(stdout.toString()).toContain('User deleted successfully')
  })

  it('should delete a user by id successfully with --confirm', async () => {
    const user = await seedUser('deltest3')

    const { stdout, exitCode } =
      await $`bun run src/scripts/delete-user.ts --id ${user.id} --confirm`
        .nothrow()
        .quiet()

    expect(exitCode).toBe(0)
    expect(stdout.toString()).toContain('User deleted successfully')
  })

  it('should fail if user not found', async () => {
    const { stderr, exitCode } =
      await $`bun run src/scripts/delete-user.ts --email non_existent@example.com --confirm`
        .nothrow()
        .quiet()

    expect(exitCode).toBe(1)
    expect(stderr.toString()).toContain('Error: User not found')
  })

  it('should fail with missing arguments', async () => {
    const { stderr, exitCode } = await $`bun run src/scripts/delete-user.ts`
      .nothrow()
      .quiet()

    expect(exitCode).toBe(1)
    expect(stderr.toString()).toContain('Usage: bun run delete-user')
  })

  it('should cascade delete conversations and comments', async () => {
    const user = await seedUser('deltest4')

    // Create a conversation
    const [conv] = await sql`
      INSERT INTO conversations (title, user_id, transcript)
      VALUES ('Test Conv', ${user.id}, '[]')
      RETURNING id
    `

    // Create a comment
    const [comment] = await sql`
      INSERT INTO comments (conversation_id, user_id, content)
      VALUES (${conv.id}, ${user.id}, 'Test comment')
      RETURNING id
    `

    // Create a like
    await sql`
      INSERT INTO likes (conversation_id, user_id)
      VALUES (${conv.id}, ${user.id})
    `

    const { stdout, exitCode } =
      await $`bun run src/scripts/delete-user.ts --email ${user.email} --confirm`
        .nothrow()
        .quiet()

    expect(exitCode).toBe(0)
    const out = stdout.toString()
    expect(out).toContain('User deleted successfully')
    expect(out).toContain('1 conversations')
    expect(out).toContain('1 comments')
    expect(out).toContain('1 likes')

    const [deletedConv] =
      await sql`SELECT id FROM conversations WHERE id = ${conv.id}`
    expect(deletedConv).toBeUndefined()

    const [deletedComment] =
      await sql`SELECT id FROM comments WHERE id = ${comment.id}`
    expect(deletedComment).toBeUndefined()
  })
})
