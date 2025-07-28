import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichmentLinkedin } from '../../../db/schema'

export const getEnrichmentLinkedins = async (enrichmentId: string) => {
  const linkedin = await db
    .select()
    .from(enrichmentLinkedin)
    .where(eq(enrichmentLinkedin.enrichmentId, enrichmentId))

  return linkedin
}
