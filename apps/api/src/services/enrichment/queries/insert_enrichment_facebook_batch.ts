import { db } from '../../../db/db'
import { enrichmentFacebook } from '../../../db/schema'

type FacebookData = { url: string; username: string }

export const insertEnrichmentFacebookBatch = async (
  enrichmentId: string,
  facebooks: FacebookData[],
) => {
  if (!facebooks.length) return

  return db
    .insert(enrichmentFacebook)
    .values(
      facebooks.map((facebook) => ({
        enrichmentId,
        url: facebook.url,
        username: facebook.username,
      })),
    )
    .onConflictDoNothing()
}
