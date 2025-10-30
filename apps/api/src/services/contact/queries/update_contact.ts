import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contact } from '../../../db/schema'
import type * as schema from '../../../db/schema'

export const setContactPrimary = async (
  contactId: string,
  userPlaceId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<boolean> => {
  const dbOrTx = tx ?? db

  // Use transaction to ensure atomicity
  return await dbOrTx.transaction(async (trx) => {
    // 1. Remove primary flag from all contacts for this place
    await trx
      .update(contact)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(contact.userPlaceId, userPlaceId))

    // 2. Set the specified contact as primary
    const result = await trx
      .update(contact)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(
        and(eq(contact.id, contactId), eq(contact.userPlaceId, userPlaceId)),
      )
      .returning()

    if (result.length === 0) {
      logger.warn({
        msg: 'Attempted to set non-existent contact as primary',
        event: 'set_primary_contact_not_found',
        metadata: { contactId, userPlaceId },
      })
      throw new Error('Contact not found')
    }

    logger.info({
      msg: 'Successfully set contact as primary',
      event: 'contact_set_primary',
      metadata: {
        contactId,
        userPlaceId,
        firstName: result[0].firstName,
        lastName: result[0].lastName,
      },
    })

    return true
  })
}

export const unsetContactPrimary = async (
  contactId: string,
  userPlaceId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<boolean> => {
  const dbOrTx = tx ?? db

  const result = await dbOrTx
    .update(contact)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(and(eq(contact.id, contactId), eq(contact.userPlaceId, userPlaceId)))
    .returning()

  if (result.length === 0) {
    logger.warn({
      msg: 'Attempted to unset primary on non-existent contact',
      event: 'unset_primary_contact_not_found',
      metadata: { contactId, userPlaceId },
    })
    throw new Error('Contact not found')
  }

  logger.info({
    msg: 'Successfully unset contact as primary',
    event: 'contact_unset_primary',
    metadata: {
      contactId,
      userPlaceId,
      firstName: result[0].firstName,
      lastName: result[0].lastName,
    },
  })

  return true
}
