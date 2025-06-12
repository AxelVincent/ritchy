import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { contact, status } from '../../../../db/schema'
import { getPlaceDetailsV1 } from '../../../google_maps/place_details_V1'

export const fetchContacts = async (placeIds: string[], userId: string) =>
  Promise.all(
    placeIds.map(async (placeId) => {
      const [existingContact] = await db
        .select()
        .from(contact)
        .where(and(eq(contact.placeId, placeId), eq(contact.userId, userId)))

      if (!existingContact) {
        const place = await getPlaceDetailsV1(placeId)
        const [newContact] = await db
          .insert(contact)
          .values({
            placeId,
            userId,
            firstname: place.name,
            lastname: '',
            email: '',
            phone: place.phone,
          })
          .returning()

        return newContact
      }

      return existingContact
    }),
  )

export const fetchStatusData = (placeIds: string[], userId: string) =>
  db
    .select()
    .from(status)
    .where(and(inArray(status.placeId, placeIds), eq(status.userId, userId)))

export const fetchPlaces = (placeIds: string[]) =>
  Promise.all(placeIds.map((placeId) => getPlaceDetailsV1(placeId)))
