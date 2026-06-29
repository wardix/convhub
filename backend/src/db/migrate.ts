import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { sql } from './connection.js'

async function migrate() {
  console.log('Running migrations...')

  // Create migrations tracking table
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  const migrationsDir = join(import.meta.dir, 'migrations')
  let files = []
  try {
    files = await readdir(migrationsDir)
  } catch (error) {
    console.error('Failed to read migrations directory:', error)
    throw error
  }

  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort()

  for (const file of sqlFiles) {
    const [existing] = await sql`
      SELECT id FROM _migrations WHERE name = ${file}
    `
    if (!existing) {
      console.log(`Executing migration: ${file}`)
      const filePath = join(migrationsDir, file)
      const content = await Bun.file(filePath).text()

      // Execute the migration SQL
      try {
        await sql.unsafe(content)
        await sql`
          INSERT INTO _migrations (name) VALUES (${file})
        `
        console.log(`✓ Migration ${file} applied successfully.`)
      } catch (err) {
        console.error(`✗ Migration ${file} failed:`, err)
        throw err
      }
    } else {
      console.log(`- Migration ${file} already applied, skipping.`)
    }
  }

  console.log('Migrations complete.')
}

if (import.meta.main) {
  migrate().catch(() => process.exit(1))
}

export { migrate }
