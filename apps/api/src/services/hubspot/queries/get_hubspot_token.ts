import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { hubspotToken } from '../../../db/schema'

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
