import type {
  EnrichedStatus,
  Place as PlaceApi,
  PlaceListAssociation,
} from '@ritchy/types'
import { db } from 'apps/api/src/db/db'
import { type InferSelectModel, sql } from 'drizzle-orm'
import type {
  contactEmail,
  contactPhone,
  contactSocialMedia,
  enrichment,
  note,
  place,
  status,
  userPlace,
} from '../../../db/schema'

// Infer types from the schemas
type Place = InferSelectModel<typeof place>
type UserPlace = InferSelectModel<typeof userPlace>
type ContactEmail = InferSelectModel<typeof contactEmail>
type ContactSocialMedia = InferSelectModel<typeof contactSocialMedia>
type ContactPhone = InferSelectModel<typeof contactPhone>
type Note = InferSelectModel<typeof note>
type Status = InferSelectModel<typeof status>
type Enrichment = InferSelectModel<typeof enrichment>

// Create the aggregated type using schema inference
export interface AggregatedUserPlace extends Place {
  user_place_id: UserPlace['id']
  notes: Note[]

  // Status
  status: Status['status']

  // Lists
  lists: PlaceListAssociation[]

  // Contact emails as JSONB array
  contact_emails: ContactEmail[]
  contact_phones: ContactPhone[]

  // Social media contacts as JSONB arrays
  contact_linkedins: ContactSocialMedia[]
  contact_instagrams: ContactSocialMedia[]
  contact_facebooks: ContactSocialMedia[]

  // Enrichment fields
  description: Enrichment['description']
  short_description: Enrichment['shortDescription']
  domain_registered_at: Enrichment['domainRegisteredAt']
  enriched_at: UserPlace['enriched_at']
  success: Enrichment['success']
}

export const getAggregatedUserPlaces = async (
  userId: string,
  searchId?: string,
  listId?: string,
): Promise<PlaceApi[]> => {
  const searchCondition = searchId
    ? sql`AND s.id = ${searchId}`
    : sql`AND s.id IS NULL`
  const listCondition = listId
    ? sql`AND l.id = ${listId}`
    : sql`AND l.id IS NULL`

  const query = sql`
   /*+ 
      INDEX(u, idx_user_id) 
      INDEX(s, idx_search_user_id) 
      INDEX(sp, idx_search_place_search_id)
      INDEX(l, idx_list_user_id)
      INDEX(lp, idx_list_place_list_id)
      INDEX(up, idx_user_place_place_id)
      INDEX(sts, idx_user_place_status)
      INDEX(n, idx_note_user_place_id)
      INDEX(c, idx_contact_user_place_id)
      INDEX(ce, idx_contact_email_contact_id)
      INDEX(cp, idx_contact_phone_contact_id)
      INDEX(csm, idx_contact_social_media_contact_id)
      INDEX(all_lp, idx_list_place_user_place_id)
      INDEX(all_lists, idx_list_user_id)
      USE_NL(u, s)
      USE_NL(s, sp)
      USE_NL(l, lp)
      USE_NL(up, p)
      USE_NL(up, sts)
      USE_NL(up, e)
    */
    SELECT DISTINCT ON (up.id)
     -- Essential place fields only (explicit selection)
     p.id,
      p.source_id,
      p.source,
      p.source_url,
      p.website,
      p.name,
      p.location,
      p.types,
      p.primary_type,
      p.price_level,
      p.price_range,
      p.rating,
      p.rating_count,
      p.phone,
      p.utc_offset_minutes,
      p.formatted_address,
      p.short_formatted_address,
      p.country,
      p.locality,
      p.sublocality,
      p.postal_code,
      p.postal_code_suffix,
      p.plus_code,
      p.street,
      p.street_number,
      p.neighborhood,
      p.administrative_area_level_1,
      p.administrative_area_level_2,
      p.administrative_area_level_3,
      p.is_deleted,
      p.created_at,
      p.updated_at,
      p.opening_hours,
      -- User place fields
      up.id as user_place_id,
      up.enriched_at,
      -- Status
      CASE
        WHEN sts.status IS NULL THEN 'NEW'
        ELSE sts.status
      END AS status,
      -- Related data (LATERAL joins)
      COALESCE(notes_data.notes, '[]'::jsonb) as notes,
      COALESCE(lists_data.lists, '[]'::jsonb) as lists,
      COALESCE(contacts_data.contact_emails, '[]'::jsonb) as contact_emails,
      COALESCE(contacts_data.contact_phones, '[]'::jsonb) as contact_phones,
      COALESCE(contacts_data.contact_linkedins, '[]'::jsonb) as contact_linkedins,
      COALESCE(contacts_data.contact_instagrams, '[]'::jsonb) as contact_instagrams,
      COALESCE(contacts_data.contact_facebooks, '[]'::jsonb) as contact_facebooks,
      -- Enrichment fields
      e.description,
      e.short_description,
      e.domain_registered_at,
      e.success
    FROM "user" u
    LEFT JOIN "search" s ON s.user_id = u.id ${searchCondition}
    LEFT JOIN "search_place" sp ON sp.search_id = s.id
    LEFT JOIN "list" l ON l.user_id = u.id ${listCondition}
    LEFT JOIN "list_place" lp ON lp.list_id = l.id
    LEFT JOIN "user_place" up ON up.id = COALESCE(sp.user_place_id, lp.user_place_id)
    LEFT JOIN "place" p ON p.id = up.place_id
    LEFT JOIN "status" sts ON sts.user_place_id = up.id
    LEFT JOIN "enrichment" e ON e.place_id = p.id AND up.enriched_at IS NOT NULL
    LEFT JOIN LATERAL (
      SELECT 
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', n.id,
            'note', n.note,
            'user_id', n.user_id,
            'user_place_id', n.user_place_id,
            'created_at', n.created_at,
            'updated_at', n.updated_at
          ) ORDER BY n.created_at DESC
        ) FILTER (WHERE n.id IS NOT NULL) as notes
      FROM note n
      WHERE n.user_place_id = up.id
    ) notes_data ON true
    LEFT JOIN LATERAL (
      SELECT 
        JSONB_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', all_lists.id,
            'emoji', all_lists.emoji,
            'name', all_lists.name,
            'created_at', all_lists.created_at,
            'updated_at', all_lists.updated_at
          )
        ) FILTER (WHERE all_lists.id IS NOT NULL) as lists
      FROM list_place all_lp
      JOIN list all_lists ON all_lists.id = all_lp.list_id
      WHERE all_lp.user_place_id = up.id
    ) lists_data ON true
    LEFT JOIN LATERAL (
      SELECT 
        JSONB_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', ce.id,
            'email', ce.email,
            'is_primary', ce.is_primary,
            'contact_id', c.id,
            'contact_name', CONCAT(c.first_name, ' ', c.last_name),
            'source', COALESCE(ce.source, 'unknown'),
            'is_verified', ce.is_verified,
            'quality', ce.quality,
            'result', ce.result,
            'role', ce.role,
            'free', ce.free,
            'created_at', ce.created_at,
            'updated_at', ce.updated_at
          )
        ) FILTER (WHERE ce.id IS NOT NULL) as contact_emails,
        JSONB_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', cp.id,
            'phone', cp.phone,
            'type', cp.type,
            'contact_id', c.id,
            'contact_name', CONCAT(c.first_name, ' ', c.last_name),
            'is_primary', cp.is_primary,
            'created_at', cp.created_at,
            'updated_at', cp.updated_at
          )
        ) FILTER (WHERE cp.id IS NOT NULL) as contact_phones,
        JSONB_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', csm.id,
            'url', csm.url,
            'is_primary', csm.is_primary,
            'contact_id', c.id,
            'contact_name', CONCAT(c.first_name, ' ', c.last_name),
            'created_at', csm.created_at,
            'updated_at', csm.updated_at
          )
        ) FILTER (WHERE csm.id IS NOT NULL AND csm.social_media_platform = 'LINKEDIN') as contact_linkedins,
        JSONB_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', csm.id,
            'url', csm.url,
            'is_primary', csm.is_primary,
            'contact_id', c.id,
            'contact_name', CONCAT(c.first_name, ' ', c.last_name),
            'created_at', csm.created_at
          )
        ) FILTER (WHERE csm.id IS NOT NULL AND csm.social_media_platform = 'INSTAGRAM') as contact_instagrams,
        JSONB_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', csm.id,
            'url', csm.url,
            'is_primary', csm.is_primary,
            'contact_id', c.id,
            'contact_name', CONCAT(c.first_name, ' ', c.last_name),
            'created_at', csm.created_at
          )
        ) FILTER (WHERE csm.id IS NOT NULL AND csm.social_media_platform = 'FACEBOOK') as contact_facebooks
      FROM contact c
      LEFT JOIN contact_email ce ON ce.contact_id = c.id
      LEFT JOIN contact_phone cp ON cp.contact_id = c.id
      LEFT JOIN contact_social_media csm ON csm.contact_id = c.id
      WHERE c.user_place_id = up.id
    ) contacts_data ON true
    WHERE u.id = ${userId}
    AND (s.id IS NOT NULL OR l.id IS NOT NULL)
  `

  const result = (await db.execute(query)) as unknown as AggregatedUserPlace[]

  return result.map((result) => {
    // Calculate enriched status based on enrichment success and timing
    let enrichedStatus: EnrichedStatus | null = null

    if (result.enriched_at && result.success !== undefined) {
      if (result.success === false) {
        enrichedStatus = 'ENRICHMENT_ERROR'
      } else if (result.success === true) {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
        const enrichedAt = new Date(result.enriched_at)
        enrichedStatus =
          enrichedAt > thirtyMinutesAgo ? 'RECENTLY_ENRICHED' : 'ENRICHED'
      }
    }

    return {
      id: result.user_place_id,
      name: result.name ?? '',
      sourceId: result.source_id,
      source: result.source,
      sourceUrl: result.source_url,
      location: result.location ?? { latitude: 0, longitude: 0 },
      website: result.website ?? undefined,
      types: result.types ?? [],
      primaryType: result.primary_type ?? undefined,
      priceLevel: result.price_level ?? undefined,
      priceRange: result.price_range ?? undefined,
      rating: result.rating ?? undefined,
      ratingCount: result.rating_count ?? undefined,
      utcOffsetMinutes: result.utc_offset_minutes ?? 0,
      phone: result.phone ?? undefined,
      isDeleted: result.is_deleted ?? false,
      address: {
        formattedAddress: result.formatted_address ?? undefined,
        shortFormattedAddress: result.short_formatted_address ?? undefined,
        country: result.country ?? undefined,
        locality: result.locality ?? undefined,
        sublocality: result.sublocality ?? undefined,
        postalCode: result.postal_code ?? undefined,
        postalCodeSuffix: result.postal_code_suffix ?? undefined,
        plusCode: result.plus_code ?? undefined,
        street: result.street ?? undefined,
        streetNumber: result.street_number ?? undefined,
        neighborhood: result.neighborhood ?? undefined,
        administrativeAreaLevel1:
          result.administrative_area_level_1 ?? undefined,
        administrativeAreaLevel2:
          result.administrative_area_level_2 ?? undefined,
        administrativeAreaLevel3:
          result.administrative_area_level_3 ?? undefined,
      },
      openingHours: result.opening_hours ?? undefined,
      listId: listId ?? null,
      lists: result.lists,
      notes: result.notes,
      status: result.status,
      domainRegisteredAt: result.domain_registered_at,
      description: result.description,
      shortDescription: result.short_description,
      contactEmails: result.contact_emails.map((email) => ({
        id: email.id,
        email: email.email,
        isPrimary: email.is_primary,
        contactId: email.contact_id,
        isVerified: email.is_verified,
        source: email.source,
        quality: email.quality,
        result: email.result,
        role: email.role,
        free: email.free,
        createdAt: new Date(email.created_at),
        updatedAt: new Date(email.updated_at),
      })),
      contactPhones: result.contact_phones,
      contactLinkedins: result.contact_linkedins,
      contactInstagrams: result.contact_instagrams,
      contactFacebooks: result.contact_facebooks,
      hubspotSynced: false,
      enrichedStatus,
    }
  })
}
