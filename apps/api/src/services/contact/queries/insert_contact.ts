import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contact } from '../../../db/schema'
import type * as schema from '../../../db/schema'
import type { ContactType } from '../../../shared'

export const insertContact = async (
  data: {
    type: ContactType
    officerId: string | null
    userPlaceId: string
    firstName: string | null
    lastName: string | null
    isPrimary?: boolean
  },
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db

  // Check if a contact with this officerId already exists for this userPlaceId
  if (data.officerId) {
    const existingContact = await dbOrTx
      .select()
      .from(contact)
      .where(
        and(
          eq(contact.officerId, data.officerId),
          eq(contact.userPlaceId, data.userPlaceId),
        ),
      )
      .limit(1)

    if (existingContact.length > 0) {
      logger.debug({
        msg: 'Contact with officerId already exists, returning existing contact',
        event: 'contact_already_exists',
        metadata: {
          contactId: existingContact[0].id,
          officerId: data.officerId,
          userPlaceId: data.userPlaceId,
        },
      })
      return existingContact[0]
    }
  }

  logger.debug({
    msg: 'Inserting contact',
    event: 'inserting_contact',
    metadata: { data },
  })

  const [newContact] = await dbOrTx
    .insert(contact)
    .values({
      type: data.type,
      officerId: data.officerId,
      userPlaceId: data.userPlaceId,
      firstName: data.firstName,
      lastName: data.lastName,
      isPrimary: data.isPrimary ?? false,
    })
    .returning()

  logger.debug({
    msg: 'Contact inserted',
    event: 'contact_inserted',
    metadata: { contactId: newContact.id },
  })

  return newContact
}
