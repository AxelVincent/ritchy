import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import { enrichmentLinkedin } from '../../../../db/schema'
import type * as schema from '../../../../db/schema'

type LinkedinData = { url: string; name: string; type: string }

export const insertEnrichmentLinkedinBatch = async (
  enrichmentId: string,
  linkedins: LinkedinData[],
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  if (!linkedins.length) return

  return dbOrTx
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
