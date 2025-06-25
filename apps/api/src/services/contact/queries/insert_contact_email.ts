import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { contactEmail } from '../../../db/schema'
import type * as schema from '../../../db/schema'

export interface InsertContactEmailData {
  contactId: string
  email: string
  isPrimary: boolean
  source: string
}

/**
 * Insert multiple contact emails within a transaction
 * @param tx Transaction instance
 * @param emails Array of email data to insert
 * @returns Array of inserted contact emails
 */
export const insertContactEmailsWithTransaction = async (
  tx: PostgresJsDatabase<typeof schema>,
  emails: InsertContactEmailData[],
) => {
  if (emails.length === 0) {
    logger.debug({
      msg: 'No emails to insert',
      event: 'no_emails_to_insert',
      metadata: {
        totalEmails: emails.length,
      },
    })
    return []
  }

  const insertedEmails = await tx
    .insert(contactEmail)
    .values(emails)
    .returning()

  return insertedEmails
}
