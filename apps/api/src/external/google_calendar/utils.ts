import { db } from '../../db/db'
import { googleOauthTokens } from '../../db/schema'
import { eq } from 'drizzle-orm'
import type { GoogleCalendarTokens } from './types'

export async function storeTokensInDatabase(
  userId: string,
  tokens: GoogleCalendarTokens,
) {
  const existingTokens = await db.query.googleOauthTokens.findFirst({
    where: eq(googleOauthTokens.userId, userId),
  })

  if (existingTokens) {
    await db
      .update(googleOauthTokens)
      .set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        scope: tokens.scope,
        tokenType: tokens.tokenType,
        idToken: tokens.idToken,
        createTime: new Date(),
      })
      .where(eq(googleOauthTokens.userId, userId))
  } else {
    await db.insert(googleOauthTokens).values({
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      scope: tokens.scope,
      tokenType: tokens.tokenType,
      idToken: tokens.idToken,
      createTime: new Date(),
    })
  }
}
