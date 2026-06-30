import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { corsMiddleware } from './middleware/cors.js'

import { auth } from './routes/auth.js'
import { comments, conversationComments } from './routes/comments.js'
import { conversations } from './routes/conversations.js'
import { feed } from './routes/feed.js'
import { follows } from './routes/follows.js'
import { likes } from './routes/likes.js'
import { tags } from './routes/tags.js'
import { users } from './routes/users.js'

const app = new Hono()

// CORS middleware
app.use('*', corsMiddleware)

// 1MB body limit
app.use(
  '*',
  bodyLimit({
    maxSize: 1024 * 1024,
    onError: (c) => {
      return c.json({ error: 'Payload Too Large', status: 413 }, 413)
    },
  }),
)

app.route('/api/auth', auth)
app.route('/api/conversations', conversations)
app.route('/api/conversations', likes)
app.route('/api/conversations', conversationComments)
app.route('/api/comments', comments)
app.route('/api/tags', tags)
app.route('/api/users', follows)
app.route('/api/users', users)
app.route('/api/feed', feed)

// Public config endpoint
app.get('/api/config', (c) => {
  return c.json({
    signupEnabled: process.env.DISABLE_SIGNUP !== 'true',
    googleAuthEnabled: Boolean(process.env.GOOGLE_CLIENT_ID),
  })
})

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' })
})

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}
