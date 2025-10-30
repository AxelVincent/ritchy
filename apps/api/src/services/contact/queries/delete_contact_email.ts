import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import { contactEmail } from '../../../db/schema/contact'

export const deleteContactEmail = async (
  emailId: string,
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<boolean> => {
  const dbOrTx = tx ?? db

  const result = await dbOrTx
    .delete(contactEmail)
    .where(
      and(eq(contactEmail.id, emailId), eq(contactEmail.contact_id, contactId)),
    )
    .returning()

  if (result.length === 0) {
    logger.warn({
      msg: 'Attempted to delete non-existent or unauthorized email',
      event: 'delete_contact_email_not_found',
      metadata: { emailId, contactId },
    })
    return false
  }

  logger.info({
    msg: 'Successfully deleted contact email',
    event: 'contact_email_deleted',
    metadata: { emailId, contactId, email: result[0].email },
  })

  return true
}
