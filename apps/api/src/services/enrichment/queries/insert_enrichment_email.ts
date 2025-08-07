import { db } from '../../../db/db'
import { enrichmentEmail } from '../../../db/schema/enrichment'

export const insertEnrichmentEmail = async (
  enrichmentId: string,
  source: string,
  email: string,
  quality: string,
  result: string,
  free: boolean,
  role: boolean,
): Promise<void> => {
  await db
    .insert(enrichmentEmail)
    .values({
      enrichmentId,
      email,
      quality,
      result,
      free,
      role,
      source,
    })
    .onConflictDoNothing()
}
