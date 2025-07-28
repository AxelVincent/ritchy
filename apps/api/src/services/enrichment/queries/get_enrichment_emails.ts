import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichmentEmail } from '../../../db/schema'

export const getEnrichmentEmails = async (enrichmentId: string) => {
  const emails = await db
    .select()
    .from(enrichmentEmail)
    .where(eq(enrichmentEmail.enrichmentId, enrichmentId))

  return emails
}
