import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { status } from '../../../../db/schema'
import { getPlaceDetailsV1 } from '../../../google_maps/place_details_V1'
import { fetchOrCreateContacts } from '../../../../services/contact/queries/fetch_or_create_contact'

// Re-export the contact function for backward compatibility
export const fetchContacts = fetchOrCreateContacts

export const fetchStatusData = (placeIds: string[], userId: string) =>
  db
    .select()
    .from(status)
    .where(and(inArray(status.placeId, placeIds), eq(status.userId, userId)))

export const fetchPlaces = (placeIds: string[]) =>
  Promise.all(placeIds.map((placeId) => getPlaceDetailsV1(placeId)))
