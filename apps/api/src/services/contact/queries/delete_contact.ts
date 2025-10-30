import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contact } from '../../../db/schema'
import type * as schema from '../../../db/schema'

export const deleteContact = async (
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db

  logger.debug({
    msg: 'Deleting contact',
    event: 'deleting_contact',
    metadata: { contactId },
  })

  // Check if contact is primary
  const [existingContact] = await dbOrTx
    .select({ isPrimary: contact.isPrimary })
    .from(contact)
    .where(eq(contact.id, contactId))
    .limit(1)

  if (!existingContact) {
    throw new Error('Contact not found')
  }

  if (existingContact.isPrimary) {
    throw new Error(
      'Cannot delete primary contact. Set another contact as primary first.',
    )
  }

  // Delete the contact (cascade will handle related records)
  const [deletedContact] = await dbOrTx
    .delete(contact)
    .where(eq(contact.id, contactId))
    .returning({ id: contact.id })

  logger.debug({
    msg: 'Contact deleted',
    event: 'contact_deleted',
    metadata: { contactId: deletedContact.id },
  })

  return deletedContact
}
