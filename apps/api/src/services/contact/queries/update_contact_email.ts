import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import { contactEmail } from '../../../db/schema/contact'

export const setContactEmailPrimary = async (
  emailId: string,
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<boolean> => {
  const dbOrTx = tx ?? db

  // Use transaction to ensure atomicity
  return await dbOrTx.transaction(async (trx) => {
    // 1. Remove primary flag from all emails for this contact
    await trx
      .update(contactEmail)
      .set({ is_primary: false, updated_at: new Date() })
      .where(eq(contactEmail.contact_id, contactId))

    // 2. Set the specified email as primary
    const result = await trx
      .update(contactEmail)
      .set({ is_primary: true, updated_at: new Date() })
      .where(
        and(
          eq(contactEmail.id, emailId),
          eq(contactEmail.contact_id, contactId),
        ),
      )
      .returning()

    if (result.length === 0) {
      logger.warn({
        msg: 'Attempted to set non-existent email as primary',
        event: 'set_primary_email_not_found',
        metadata: { emailId, contactId },
      })
      throw new Error('Email not found')
    }

    logger.info({
      msg: 'Successfully set contact email as primary',
      event: 'contact_email_set_primary',
      metadata: { emailId, contactId, email: result[0].email },
    })

    return true
  })
}

export const unsetContactEmailPrimary = async (
  emailId: string,
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<boolean> => {
  const dbOrTx = tx ?? db

  const result = await dbOrTx
    .update(contactEmail)
    .set({ is_primary: false, updated_at: new Date() })
    .where(
      and(eq(contactEmail.id, emailId), eq(contactEmail.contact_id, contactId)),
    )
    .returning()

  if (result.length === 0) {
    logger.warn({
      msg: 'Attempted to unset primary on non-existent email',
      event: 'unset_primary_email_not_found',
      metadata: { emailId, contactId },
    })
    throw new Error('Email not found')
  }

  logger.info({
    msg: 'Successfully unset contact email as primary',
    event: 'contact_email_unset_primary',
    metadata: { emailId, contactId, email: result[0].email },
  })

  return true
}
