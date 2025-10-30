import type { Phone } from '@ritchy/types'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contactPhone, type phoneTypeEnum } from '../../../db/schema'
import type * as schema from '../../../db/schema'

type PhoneType = (typeof phoneTypeEnum.enumValues)[number]

export const insertContactPhone = async (
  contactId: string,
  phone: string,
  type: PhoneType,
  isPrimary = false,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<Phone> => {
  const dbOrTx = tx ?? db

  const [contactPhoneResult] = await dbOrTx
    .insert(contactPhone)
    .values({
      contactId,
      phone,
      type,
      isPrimary,
    })
    .onConflictDoNothing()
    .returning()

  return {
    id: contactPhoneResult.id,
    phone: contactPhoneResult.phone,
    type: contactPhoneResult.type,
    isPrimary: contactPhoneResult.isPrimary,
    contactId: contactPhoneResult.contactId,
    createdAt: contactPhoneResult.createdAt,
    updatedAt: contactPhoneResult.updatedAt,
  }
}
