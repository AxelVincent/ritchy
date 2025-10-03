import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichmentCompany } from '../../../db/schema'

export const getEnrichmentCompany = async (enrichmentId: string) => {
  const company = await db.query.enrichmentCompany.findFirst({
    where: eq(enrichmentCompany.enrichment_id, enrichmentId),
  })
  return company
}
