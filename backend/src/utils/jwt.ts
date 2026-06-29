import { type JWTPayload, SignJWT, jwtVerify } from 'jose'

const accessSecret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'secret',
)
const refreshSecret = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'refresh_secret',
)

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(accessSecret)
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refreshSecret)
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, accessSecret)
  return payload
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, refreshSecret)
  return payload
}
