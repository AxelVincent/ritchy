import { logger } from '@ritchy/logger'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { contact } from '../../../../db/schema'
import { contactEmail } from '../../../../db/schema'

export const getSecondaryEmailsByPlaceIds = async (
  placeIds: string[],
  userId: string,
) => {
  if (placeIds.length === 0) {
    return new Map<string, string[]>()
  }

  const secondaryEmails = await db
    .select({
      email: contactEmail.email,
      placeId: contact.placeId,
    })
    .from(contactEmail)
    .innerJoin(contact, eq(contactEmail.contactId, contact.id))
    .where(
      and(
        inArray(contact.placeId, placeIds),
        eq(contact.userId, userId),
        eq(contactEmail.isPrimary, false),
      ),
    )
    .orderBy(desc(contactEmail.createdAt))

  const result = new Map<string, string[]>()
  for (const emailData of secondaryEmails) {
    if (!result.has(emailData.placeId)) {
      result.set(emailData.placeId, [])
    }
    result.get(emailData.placeId)?.push(emailData.email)
  }

  logger.info({
    msg: 'Secondary emails fetched for places',
    event: 'secondary_emails_fetched',
    metadata: {
      placeIds,
      secondaryEmailsCount: result.size,
      secondaryEmailsData: Object.fromEntries(result),
    },
  })

  return result
}
