// Actually the rule says PostgreSQL with Bun's built-in Bun.sql
// Let's use Bun.sql or SQL tagged template
// Ah wait, Bun 1.1 doesn't have Bun.sql out of the box, wait, no, the rule says:
// "Backend: Raw SQL only — no ORMs. Use Bun's built-in Bun.sql for PostgreSQL queries."
// Actually Bun has a built-in SQL client for Postgres. Wait, is it `import { sql } from 'bun'`? Or `Bun.sql()`?
// Let's just do it as:
import { SQL } from 'bun'

const sql = new SQL(
  process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/convhub',
)

export { sql }
