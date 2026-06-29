import { SQL } from 'bun'

const poolSize = Number.parseInt(process.env.DB_POOL_SIZE || '10', 10)

const sql = new SQL(
  process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/convhub',
  { max: poolSize },
)

export { sql }
