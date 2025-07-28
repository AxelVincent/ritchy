import { logger } from '@ritchy/logger'
import type { Email } from '@ritchy/types'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import { contact } from '../../../db/schema'
import { contactEmail } from '../../../db/schema'

export const getEmailsByPlaceIds = async (userPlaceIds: string[]) => {
  if (userPlaceIds.length === 0) {
    return new Map<string, Email[]>()
  }

  const emails = await db
    .select({
      email: contactEmail.email,
      userPlaceId: contact.userPlaceId,
      isPrimary: contactEmail.isPrimary,
      createdAt: contactEmail.createdAt,
      updatedAt: contactEmail.updatedAt,
    })
    .from(contactEmail)
    .innerJoin(contact, eq(contactEmail.contactId, contact.id))
    .where(and(inArray(contact.userPlaceId, userPlaceIds)))
    .orderBy(desc(contactEmail.isPrimary))

  const result = new Map<string, Email[]>()
  for (const emailData of emails) {
    result.set(emailData.userPlaceId, [
      ...(result.get(emailData.userPlaceId) || []),
      emailData,
    ])
  }

  logger.debug({
    msg: 'Emails fetched for places',
    event: 'emails_fetched',
    metadata: {
      userPlaceIds,
      emailsCount: result.size,
      emailsData: Object.fromEntries(result),
    },
  })

  return result
}
