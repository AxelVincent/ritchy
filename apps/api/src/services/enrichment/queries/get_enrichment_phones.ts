import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichmentPhone } from '../../../db/schema'

export const getEnrichmentPhones = async (enrichmentId: string) => {
  const phones = await db
    .select()
    .from(enrichmentPhone)
    .where(eq(enrichmentPhone.enrichmentId, enrichmentId))

  return phones
}
