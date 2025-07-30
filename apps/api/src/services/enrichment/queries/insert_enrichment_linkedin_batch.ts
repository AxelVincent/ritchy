import { db } from '../../../db/db'
import { enrichmentLinkedin } from '../../../db/schema'

type LinkedinData = { url: string; name: string; type: string }

export const insertEnrichmentLinkedinBatch = async (
  enrichmentId: string,
  linkedins: LinkedinData[],
) => {
  if (!linkedins.length) return

  return db
    .insert(enrichmentLinkedin)
    .values(
      linkedins.map((linkedin) => ({
        enrichmentId,
        url: linkedin.url,
        name: linkedin.name,
        type: linkedin.type,
      })),
    )
    .onConflictDoNothing()
}
