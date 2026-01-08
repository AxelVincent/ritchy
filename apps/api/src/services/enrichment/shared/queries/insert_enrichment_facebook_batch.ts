import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import { enrichmentFacebook } from '../../../../db/schema'
import type * as schema from '../../../../db/schema'

type FacebookData = { url: string; username: string }

export const insertEnrichmentFacebookBatch = async (
  enrichmentId: string,
  facebooks: FacebookData[],
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  if (!facebooks.length) return

  return dbOrTx
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
