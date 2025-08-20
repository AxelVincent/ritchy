import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contactEmail } from '../../../db/schema'
import type * as schema from '../../../db/schema'

export const insertContactEmails = async (
  contactId: string,
  emails: string[],
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  if (emails.length === 0) {
    return
  }

  await dbOrTx
    .insert(contactEmail)
    .values(
      emails.map((email) => ({
        contactId,
        email,
      })),
    )
    .onConflictDoNothing()
}
