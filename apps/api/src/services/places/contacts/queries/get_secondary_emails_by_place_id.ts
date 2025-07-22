import { logger } from '@ritchy/logger'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { contact } from '../../../../db/schema'
import { contactEmail } from '../../../../db/schema'

export const getSecondaryEmailsByPlaceIds = async (userPlaceIds: string[]) => {
  if (userPlaceIds.length === 0) {
    return new Map<string, string[]>()
  }

  const secondaryEmails = await db
    .select({
      email: contactEmail.email,
      userPlaceId: contact.userPlaceId
    })
    .from(contactEmail)
    .innerJoin(contact, eq(contactEmail.contactId, contact.id))
    .where(inArray(contact.userPlaceId, userPlaceIds))
    .orderBy(desc(contactEmail.createdAt))

  const result = new Map<string, string[]>()
  for (const emailData of secondaryEmails) {
    if (!result.has(emailData.userPlaceId)) {
      result.set(emailData.userPlaceId, [])
    }
    result.get(emailData.userPlaceId)?.push(emailData.email)
  }

  logger.info({
    msg: 'Secondary emails fetched for places',
    event: 'secondary_emails_fetched',
    metadata: {
      userPlaceIds,
      secondaryEmailsCount: result.size,
      secondaryEmailsData: Object.fromEntries(result)
    }
  })

  return result
}
