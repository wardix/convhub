import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// CORS middleware
app.use('*', cors())

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' })
})

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}
