import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { enrichmentInstagram } from '../../../db/schema'
import type * as schema from '../../../db/schema'

type InstagramData = { url: string; username: string }

export const insertEnrichmentInstagramBatch = async (
  enrichmentId: string,
  instagrams: InstagramData[],
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  if (!instagrams.length) return

  return dbOrTx
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
