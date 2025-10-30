import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import { contactPhone } from '../../../db/schema/contact'

export const setContactPhonePrimary = async (
  phoneId: string,
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<boolean> => {
  const dbOrTx = tx ?? db

  // Use transaction to ensure atomicity
  return await dbOrTx.transaction(async (trx) => {
    // 1. Remove primary flag from all phones for this contact
    await trx
      .update(contactPhone)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(contactPhone.contactId, contactId))

    // 2. Set the specified phone as primary
    const result = await trx
      .update(contactPhone)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(
        and(
          eq(contactPhone.id, phoneId),
          eq(contactPhone.contactId, contactId),
        ),
      )
      .returning()

    if (result.length === 0) {
      logger.warn({
        msg: 'Attempted to set non-existent phone as primary',
        event: 'set_primary_phone_not_found',
        metadata: { phoneId, contactId },
      })
      throw new Error('Phone not found')
    }

    logger.info({
      msg: 'Successfully set contact phone as primary',
      event: 'contact_phone_set_primary',
      metadata: { phoneId, contactId, phone: result[0].phone },
    })

    return true
  })
}

export const unsetContactPhonePrimary = async (
  phoneId: string,
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<boolean> => {
  const dbOrTx = tx ?? db

  const result = await dbOrTx
    .update(contactPhone)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(
      and(eq(contactPhone.id, phoneId), eq(contactPhone.contactId, contactId)),
    )
    .returning()

  if (result.length === 0) {
    logger.warn({
      msg: 'Attempted to unset primary on non-existent phone',
      event: 'unset_primary_phone_not_found',
      metadata: { phoneId, contactId },
    })
    throw new Error('Phone not found')
  }

  logger.info({
    msg: 'Successfully unset contact phone as primary',
    event: 'contact_phone_unset_primary',
    metadata: { phoneId, contactId, phone: result[0].phone },
  })

  return true
}
