import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contactLinkedin } from '../../../db/schema'
import type * as schema from '../../../db/schema'

export interface InsertContactLinkedinData {
  contactId: string
  profileUrl: string
  confidence: number
  reasoning: string | null
  source: string
}

export const insertContactLinkedin = async (
  data: InsertContactLinkedinData,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db

  await dbOrTx
    .insert(contactLinkedin)
    .values({
      contactId: data.contactId,
      profileUrl: data.profileUrl,
      confidence: data.confidence,
      reasoning: data.reasoning,
      source: data.source,
    })
    .onConflictDoNothing()
}
