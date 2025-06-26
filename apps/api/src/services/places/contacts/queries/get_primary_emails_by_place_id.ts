import { logger } from '@ritchy/logger'
import type { ContactEmail } from '@ritchy/types'
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
    return new Map<string, Array<ContactEmail>>()
  }

  const primaryEmails = await db
    .select({
      id: contactEmail.id,
      contactId: contactEmail.contactId,
      email: contactEmail.email,
      isPrimary: contactEmail.isPrimary,
      createdAt: contactEmail.createdAt,
      updatedAt: contactEmail.updatedAt,
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

  // Process results more efficiently
  const result = primaryEmails.reduce<Map<string, Array<ContactEmail>>>(
    (acc, email) => {
      const placeId = email.placeId
      const existing = acc.get(placeId) ?? []
      acc.set(placeId, [...existing, email])
      return acc
    },
    new Map(),
  )

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
