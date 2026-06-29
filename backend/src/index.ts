import { Hono } from 'hono'
import { corsMiddleware } from './middleware/cors.js'

import { auth } from './routes/auth.js'
import { comments, conversationComments } from './routes/comments.js'
import { conversations } from './routes/conversations.js'
import { follows } from './routes/follows.js'
import { likes } from './routes/likes.js'
import { tags } from './routes/tags.js'
import { users } from './routes/users.js'

const app = new Hono()

// CORS middleware
app.use('*', corsMiddleware)

app.route('/api/auth', auth)
app.route('/api/conversations', conversations)
app.route('/api/conversations', likes)
app.route('/api/conversations', conversationComments)
app.route('/api/comments', comments)
app.route('/api/tags', tags)
app.route('/api/users', follows)
app.route('/api/users', users)

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' })
})

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}
