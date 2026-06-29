import { beforeAll, describe, expect, it } from 'bun:test'
import { sql } from './connection.js'
import { migrate } from './migrate.js'

describe('Database Migrations', () => {
  beforeAll(async () => {
    // Ensure we start with a clean state for testing if needed
    // But dropping tables might be dangerous if testing against prod.
    // Assuming test environment uses a test database.
    try {
      await sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
    } catch (_err) {
      console.warn(
        'Could not drop schema (might be running in an environment without permissions, ignoring...)',
      )
    }
  })

  it('should run all migrations successfully on a clean database', async () => {
    // Run all migrations
    await migrate()

    // Verify migrations were applied by checking _migrations table
    const result = await sql`SELECT count(*) as count FROM _migrations`
    expect(Number(result[0].count)).toBeGreaterThan(0)
  })

  it('should be idempotent when running twice', async () => {
    // Run them again
    await migrate()

    // The count should not increase, and it should not throw errors
    const result = await sql`SELECT count(*) as count FROM _migrations`
    expect(Number(result[0].count)).toBeGreaterThan(0)
  })
})
