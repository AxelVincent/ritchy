import { db } from '../../../db/db'
import { enrichmentInstagram } from '../../../db/schema'

type InstagramData = { url: string; username: string }

export const insertEnrichmentInstagramBatch = async (
  enrichmentId: string,
  instagrams: InstagramData[],
) => {
  if (!instagrams.length) return

  return db
    .insert(enrichmentInstagram)
    .values(
      instagrams.map((instagram) => ({
        enrichmentId,
        url: instagram.url,
        username: instagram.username,
      })),
    )
    .onConflictDoNothing()
}
