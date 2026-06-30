import { parseArgs } from 'node:util'
import { sql } from '../db/connection.js'
import { hashPassword } from '../utils/password.js'
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from '../utils/validation.js'

async function main() {
  const { values } = parseArgs({
    args: Bun.argv,
    options: {
      email: { type: 'string' },
      username: { type: 'string' },
      password: { type: 'string' },
    },
    strict: true,
    allowPositionals: true,
  })

  let { email, username, password } = values

  if (!email || !username) {
    console.error(
      'Usage: bun run create-user --email <email> --username <username> [--password <password>]',
    )
    process.exit(1)
  }

  if (!password) {
    password = prompt('Enter password: ') || ''
  }

  if (!validateEmail(email)) {
    console.error('Error: Invalid email format')
    process.exit(1)
  }

  const pwCheck = validatePassword(password)
  if (!pwCheck.valid) {
    console.error(`Error: ${pwCheck.message}`)
    process.exit(1)
  }

  const unCheck = validateUsername(username)
  if (!unCheck.valid) {
    console.error(`Error: ${unCheck.message}`)
    process.exit(1)
  }

  // Check existing
  const [existing] = await sql`
    SELECT id FROM users WHERE email = ${email} OR username = ${username}
  `
  if (existing) {
    console.error('Error: Email or username already exists')
    process.exit(1)
  }

  const hashed = await hashPassword(password)
  const [user] = await sql`
    INSERT INTO users (email, username, password_hash)
    VALUES (${email}, ${username}, ${hashed})
    RETURNING id
  `

  console.log(`Successfully created user with ID: ${user.id}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Error creating user:', err)
  process.exit(1)
})
