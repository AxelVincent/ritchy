import { logger } from '@ritchy/logger'
import type { Phone } from '@ritchy/types'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import { contact, contactPhone } from '../../../db/schema'

export const getPhonesByPlaceIds = async (userPlaceIds: string[]) => {
  try {
    if (userPlaceIds.length === 0) {
      return new Map<string, Phone[]>()
    }

    const phones = await db
      .select({
        phone: contactPhone.phone,
        userPlaceId: contact.userPlaceId,
        isPrimary: contactPhone.isPrimary,
        type: contactPhone.type,
        createdAt: contactPhone.createdAt,
        updatedAt: contactPhone.updatedAt,
      })
      .from(contactPhone)
      .innerJoin(contact, eq(contactPhone.contactId, contact.id))
      .where(and(inArray(contact.userPlaceId, userPlaceIds)))
      .orderBy(desc(contactPhone.isPrimary))

    const result = new Map<string, Phone[]>()
    for (const phoneData of phones) {
      result.set(phoneData.userPlaceId, [
        ...(result.get(phoneData.userPlaceId) || []),
        phoneData,
      ])
    }

    logger.debug({
      msg: 'Phones fetched for places',
      event: 'phones_fetched',
      metadata: {
        userPlaceIds,
        phonesCount: result.size,
      },
    })

    return result
  } catch (error) {
    logger.error({
      msg: 'Error fetching phones by place ids',
      event: 'error_fetching_phones_by_place_ids',
      metadata: { error },
    })
    return new Map<string, Phone[]>()
  }
}
