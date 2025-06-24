import { db } from '../../../db/db'
import { contactEmail } from '../../../db/schema'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../db/schema'

export interface InsertContactEmailData {
  contactId: string
  email: string
  isPrimary: boolean
  source: string
}

/*

/**
 * Insert a single contact email within a transaction
 * @param tx Transaction instance
 * @param data Email data to insert
 * @returns Inserted contact email
 */
export const insert_contact_email_with_transaction = async (
  tx: PostgresJsDatabase<typeof schema>,
  data: InsertContactEmailData,
) => {
  const [insertedEmail] = await tx.insert(contactEmail).values(data).returning()

  return insertedEmail
}

/**
 * Insert multiple contact emails within a transaction
 * @param tx Transaction instance
 * @param emails Array of email data to insert
 * @returns Array of inserted contact emails
 */
export const insert_contact_emails_with_transaction = async (
  tx: PostgresJsDatabase<typeof schema>,
  emails: InsertContactEmailData[],
) => {
  if (emails.length === 0) {
    return []
  }

  const insertedEmails = await tx
    .insert(contactEmail)
    .values(emails)
    .returning()

  return insertedEmails
}
