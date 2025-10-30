import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import { contactPhone } from '../../../db/schema/contact'

export const deleteContactPhone = async (
  phoneId: string,
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<boolean> => {
  const dbOrTx = tx ?? db

  const result = await dbOrTx
    .delete(contactPhone)
    .where(
      and(eq(contactPhone.id, phoneId), eq(contactPhone.contactId, contactId)),
    )
    .returning()

  if (result.length === 0) {
    logger.warn({
      msg: 'Attempted to delete non-existent or unauthorized phone',
      event: 'delete_contact_phone_not_found',
      metadata: { phoneId, contactId },
    })
    return false
  }

  logger.info({
    msg: 'Successfully deleted contact phone',
    event: 'contact_phone_deleted',
    metadata: { phoneId, contactId, phone: result[0].phone },
  })

  return true
}
