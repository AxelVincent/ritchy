import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichmentFacebook } from '../../../db/schema'

export const getEnrichmentFacebooks = async (enrichmentId: string) => {
  const facebook = await db
    .select()
    .from(enrichmentFacebook)
    .where(eq(enrichmentFacebook.enrichmentId, enrichmentId))

  return facebook
}
