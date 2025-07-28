import { db } from 'apps/api/src/db/db'
import { enrichmentPhone } from 'apps/api/src/db/schema'
import { eq } from 'drizzle-orm'

export const getEnrichmentPhones = async (enrichmentId: string) => {
  const phones = await db
    .select()
    .from(enrichmentPhone)
    .where(eq(enrichmentPhone.enrichmentId, enrichmentId))

  return phones
}
