import { logger } from '@ritchy/logger'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { logger } from '@ritchy/logger'
import { db } from '../../../../db/db'
import { contact } from '../../../../db/schema'
import { contactEmail } from '../../../../db/schema'

export const getPrimaryEmailsByPlaceIds = async (
  placeIds: string[],
  userId: string,
) => {
  // If there are no placeIds, return empty map immediately
  if (placeIds.length === 0) {
    return new Map<string, string>()
  }

  const primaryEmails = await db
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
        eq(contactEmail.isPrimary, true),
      ),
    )
    .orderBy(desc(contactEmail.createdAt))

  // Process results to get only the first email per place
  const result = new Map<string, string>()
  for (const emailData of primaryEmails) {
    if (!result.has(emailData.placeId)) {
      result.set(emailData.placeId, emailData.email)
    }
  }

  logger.info({
    msg: 'Primary emails fetched for places',
    event: 'primary_emails_fetched',
    metadata: {
      placeIds,
      primaryEmailsCount: result.size,
      primaryEmailsData: Object.fromEntries(result),
    },
  })

  return result
}
