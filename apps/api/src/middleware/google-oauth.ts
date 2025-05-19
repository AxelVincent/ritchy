import { db } from '../db/db'
import { googleOauthTokens } from '../db/schema'
import { eq } from 'drizzle-orm'
import { getAuth } from '@clerk/express'
import type { Request } from 'express'

interface GoogleAuthRequest extends Request {
  userId: string
  googleTokens: {
    accessToken: string
    refreshToken: string
  }
}

export const googleOAuthMiddleware = async (
  req: Request,
): Promise<GoogleAuthRequest> => {
  const { userId } = getAuth(req)

  if (!userId) {
    throw new Response('Unauthorized', { status: 401 })
  }

  const tokens = await db.query.googleOauthTokens.findFirst({
    where: eq(googleOauthTokens.userId, userId),
  })

  if (!tokens) {
    throw new Response('Google OAuth not configured', { status: 401 })
  }

  // Check if token is expired (with 5-minute buffer)
  const isExpired =
    Date.now() + 5 * 60 * 1000 >
    tokens.createTime.getTime() + tokens.expiresIn * 1000

  if (isExpired) {
    throw new Response('Google OAuth token expired', { status: 401 })
  }

  return {
    ...req,
    userId,
    googleTokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  } as GoogleAuthRequest
}
