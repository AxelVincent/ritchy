import { db } from 'apps/api/src/db/db'
import { hubspotToken } from 'apps/api/src/db/schema'
import { eq } from 'drizzle-orm'

export const getHubspotToken = async (userId: string) => {
  const [token] = await db
    .select()
    .from(hubspotToken)
    .where(eq(hubspotToken.userId, userId))

  if (!token) {
    return null
  }
  return token
}
