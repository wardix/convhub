import { sql } from './backend/src/db/connection.js'
try {
  const [user] = await sql.unsafe(
    `SELECT id, username, display_name, avatar_url, bio, created_at,
              follower_count, following_count, conversation_count
       FROM users WHERE username = $1`,
    ['userprofile'],
  )
  console.log('Success:', user)
} catch (err) {
  console.error('Error:', err)
}
