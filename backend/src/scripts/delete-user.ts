import { parseArgs } from 'node:util'
import { sql } from '../db/connection.js'

async function main() {
  const { values } = parseArgs({
    args: Bun.argv,
    options: {
      email: { type: 'string' },
      username: { type: 'string' },
      id: { type: 'string' },
      confirm: { type: 'boolean', short: 'y' },
    },
    strict: true,
    allowPositionals: true,
  })

  const { email, username, id, confirm } = values

  if (!email && !username && !id) {
    console.error(
      'Usage: bun run delete-user [--email <email> | --username <username> | --id <id>] [--confirm]',
    )
    process.exit(1)
  }

  // Find user
  const query = id
    ? sql`SELECT id, email, username FROM users WHERE id = ${id}`
    : email
      ? sql`SELECT id, email, username FROM users WHERE email = ${email}`
      : sql`SELECT id, email, username FROM users WHERE username = ${username}`

  const [user] = await query

  if (!user) {
    console.error('Error: User not found')
    process.exit(1)
  }

  // Fetch stats
  const [stats] = await sql`
    SELECT
      (SELECT COUNT(*) FROM conversations WHERE user_id = ${user.id}) as conv_count,
      (SELECT COUNT(*) FROM comments WHERE user_id = ${user.id}) as comment_count,
      (SELECT COUNT(*) FROM likes WHERE user_id = ${user.id}) as like_count
  `

  console.log('\nFound user:')
  console.log(`  ID:       ${user.id}`)
  console.log(`  Email:    ${user.email}`)
  console.log(`  Username: ${user.username}`)
  console.log(`  Conversations: ${stats.conv_count}`)
  console.log(`  Comments: ${stats.comment_count}`)
  console.log('')

  if (!confirm) {
    const answer = prompt(
      'Are you sure you want to delete this user? This cannot be undone. (y/N): ',
    )
    if (!answer || answer.toLowerCase() !== 'y') {
      console.log('Aborted.')
      process.exit(0)
    }
  }

  // Perform deletion
  await sql`DELETE FROM users WHERE id = ${user.id}`

  console.log(
    `✓ User deleted successfully (cascaded: ${stats.conv_count} conversations, ${stats.comment_count} comments, ${stats.like_count} likes)`,
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('Error deleting user:', err)
  process.exit(1)
})
