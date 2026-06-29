import { Hono } from 'hono'
import { corsMiddleware } from './middleware/cors.js'

import { auth } from './routes/auth.js'

const app = new Hono()

// CORS middleware
app.use('*', corsMiddleware)

app.route('/api/auth', auth)

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' })
})

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}
