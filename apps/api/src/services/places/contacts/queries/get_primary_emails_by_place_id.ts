import { logger } from '@ritchy/logger'
import { desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { contact } from '../../../../db/schema'
import { contactEmail } from '../../../../db/schema'

export const getPrimaryEmailsByPlaceIds = async (userPlaceIds: string[]) => {
  // If there are no placeIds, return empty map immediately
  if (userPlaceIds.length === 0) {
    return new Map<string, string>()
  }

  const primaryEmails = await db
    .select({
      email: contactEmail.email,
      userPlaceId: contact.userPlaceId
    })
    .from(contactEmail)
    .innerJoin(contact, eq(contactEmail.contactId, contact.id))
    .where(inArray(contact.userPlaceId, userPlaceIds))
    .orderBy(desc(contactEmail.createdAt))

  // Process results to get only the first email per place
  const result = new Map<string, string>()
  for (const emailData of primaryEmails) {
    if (!result.has(emailData.userPlaceId)) {
      result.set(emailData.userPlaceId, emailData.email)
    }
  }

  logger.info({
    msg: 'Primary emails fetched for places',
    event: 'primary_emails_fetched',
    metadata: {
      userPlaceIds,
      primaryEmailsCount: result.size,
      primaryEmailsData: Object.fromEntries(result)
    }
  })

  return result
}
