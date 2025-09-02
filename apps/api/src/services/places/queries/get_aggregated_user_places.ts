import type { Place as PlaceApi, PlaceListAssociation } from '@ritchy/types'
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
}

export const getAggregatedUserPlaces = async (
  userId: string,
  searchId?: string,
  listId?: string,
): Promise<PlaceApi[]> => {
  const searchCondition = searchId ? sql`AND s.id = ${searchId}` : sql`AND 1=0`
  const listCondition = listId ? sql`AND l.id = ${listId}` : sql`AND 1=0`

  const query = sql`
    SELECT
    p.*,
    up.id as user_place_id,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', n.id,
                'note', n.note,
                'user_id', n.user_id,
                'user_place_id', n.user_place_id,
                'created_at', n.created_at,
                'updated_at', n.updated_at
            ) ORDER BY n.created_at DESC
        ) FILTER (WHERE n.id IS NOT NULL),
        '[]'::json
    ) as notes,
    CASE
        WHEN sts.status IS NULL THEN 'NEW'
        ELSE sts.status
    END AS status,
        COALESCE(
        JSONB_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
                'id', all_lists.id,
                'emoji', all_lists.emoji,
                'created_at', all_lists.created_at,
                'updated_at', all_lists.updated_at
            )
        ) FILTER (WHERE all_lists.id IS NOT NULL),
        '[]'::jsonb
    ) as lists,
    COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', ce.id,
                'email', ce.email,
                'is_primary', ce.is_primary,
                'contact_id', c.id,
                'contact_name', CONCAT(c.first_name, ' ', c.last_name),
                'created_at', ce.created_at
            )
        ) FILTER (WHERE ce.id IS NOT NULL),
        '[]'::jsonb
    ) as contact_emails,
    COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', cp.id,
                'phone', cp.phone,
                'type', cp.type,
                'contact_id', c.id,
                'contact_name', CONCAT(c.first_name, ' ', c.last_name),
                'created_at', cp.created_at
            )
        ) FILTER (WHERE cp.id IS NOT NULL),
        '[]'::jsonb
    ) as contact_phones,
    COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', csm.id,
                'url', csm.url,
                'is_primary', csm.is_primary,
                'contact_id', c.id,
                'contact_name', CONCAT(c.first_name, ' ', c.last_name),
                'created_at', csm.created_at
            )
        ) FILTER (WHERE csm.id IS NOT NULL AND csm.social_media_platform = 'LINKEDIN'),
        '[]'::jsonb
    ) as contact_linkedins,
    COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', csm.id,
                'url', csm.url,
                'is_primary', csm.is_primary,
                'contact_id', c.id,
                'contact_name', CONCAT(c.first_name, ' ', c.last_name),
                'created_at', csm.created_at
            )
        ) FILTER (WHERE csm.id IS NOT NULL AND csm.social_media_platform = 'INSTAGRAM'),
        '[]'::jsonb
    ) as contact_instagrams,
    COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', csm.id,
                'url', csm.url,
                'is_primary', csm.is_primary,
                'contact_id', c.id,
                'contact_name', CONCAT(c.first_name, ' ', c.last_name),
                'created_at', csm.created_at
            )
        ) FILTER (WHERE csm.id IS NOT NULL AND csm.social_media_platform = 'FACEBOOK'),
        '[]'::jsonb
    ) as contact_facebooks,
    CASE 
        WHEN up.enriched_at is not NULL THEN e.description
        ELSE NULL
    END as description,
    CASE 
        WHEN up.enriched_at is not NULL = true THEN e.short_description
        ELSE NULL
    END as short_description,
    CASE 
        WHEN up.enriched_at is not NULL = true THEN e.domain_registered_at 
        ELSE NULL
    END as domain_registered_at,
    up.enriched_at
FROM "user" u
LEFT JOIN "search" s ON s.user_id = u.id ${searchCondition}
LEFT JOIN "search_place" sp ON sp.search_id = s.id
LEFT JOIN "list" l ON l.user_id = u.id ${listCondition}
LEFT JOIN "list_place" lp ON lp.list_id = l.id
LEFT JOIN "user_place" up ON up.id = COALESCE(sp.user_place_id, lp.user_place_id)
LEFT JOIN "place" p ON p.id = up.place_id
LEFT JOIN "enrichment" e ON e.place_id = p.id AND up.enriched_at is not NULL
LEFT JOIN "note" n ON n.user_place_id = up.id
LEFT JOIN "status" sts ON sts.user_place_id = up.id
LEFT JOIN "contact" c ON c.user_place_id = up.id
LEFT JOIN "contact_email" ce ON ce.contact_id = c.id
LEFT JOIN "contact_phone" cp ON cp.contact_id = c.id
LEFT JOIN "contact_social_media" csm ON csm.contact_id = c.id
LEFT JOIN "list_place" all_lp ON all_lp.user_place_id = up.id
LEFT JOIN "list" all_lists ON all_lists.id = all_lp.list_id
WHERE u.id = ${userId}
AND (s.id IS NOT NULL OR l.id IS NOT NULL)
GROUP BY p.id, up.id, sts.id, up.enriched_at, e.description, e.short_description, e.domain_registered_at ;
  `

  const result = (await db.execute(query)) as unknown as AggregatedUserPlace[]

  return result.map((result) => ({
    id: result.user_place_id,
    name: result.name ?? '',
    sourceId: result.source_id,
    location: result.location ?? { latitude: 0, longitude: 0 },
    website: result.website ?? undefined,
    types: result.types ?? [],
    primaryType: result.primary_type ?? undefined,
    priceLevel: result.price_level ?? undefined,
    priceRange: result.price_range ?? undefined,
    rating: result.rating ?? undefined,
    ratingCount: result.rating_count ?? undefined,
    utcOffsetMinutes: result.utc_offset_minutes ?? 0,
    googleMapsUri: result.source_url ?? null,
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
      administrativeAreaLevel1: result.administrative_area_level_1 ?? undefined,
      administrativeAreaLevel2: result.administrative_area_level_2 ?? undefined,
      administrativeAreaLevel3: result.administrative_area_level_3 ?? undefined,
    },
    listId: listId ?? null,
    lists: result.lists,
    notes: result.notes,
    status: result.status,
    domainRegisteredAt: result.domain_registered_at,
    description: result.description,
    shortDescription: result.short_description,
    contactEmails: result.contact_emails,
    contactPhones: result.contact_phones,
    contactLinkedins: result.contact_linkedins,
    contactInstagrams: result.contact_instagrams,
    contactFacebooks: result.contact_facebooks,
    hubspotSynced: false,
    enrichedAt: result.enriched_at,
  }))
}
