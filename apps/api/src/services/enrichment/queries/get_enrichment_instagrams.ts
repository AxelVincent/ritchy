import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichmentInstagram } from '../../../db/schema'

export const getEnrichmentInstagrams = async (enrichmentId: string) => {
  const instagram = await db
    .select()
    .from(enrichmentInstagram)
    .where(eq(enrichmentInstagram.enrichmentId, enrichmentId))

  return instagram
}
