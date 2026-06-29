const getEnv = (key: string, defaultValue?: string) => {
  return process.env[key] || defaultValue
}

const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${key} is required in production`)
    }
    return ''
  }
  return value
}

export const config = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  JWT_SECRET: requireEnv('JWT_SECRET') || 'secret',
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET') || 'refresh_secret',
  PORT: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000,
  DATABASE_URL: getEnv(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/convhub',
  ),
}
