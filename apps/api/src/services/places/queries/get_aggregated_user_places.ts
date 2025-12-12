import {
  type EnrichedStatus,
  type ListContentFilters,
  type PaginationParams,
  type Place as PlaceApi,
  type PlaceListAssociation,
  type SortOrder,
  USER_PLACES_DEFAULT_SORT,
  getEffectiveSortColumn,
} from '@ritchy/types'
import { type InferSelectModel, sql } from 'drizzle-orm'
import { db } from '../../../db/db'
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
import {
  buildPlaceFilterConditions,
  buildSortClause,
  buildSortClauseMain,
} from '../../../utils/filters/place-filters'
import {
  calculateOffset,
  getSafePaginationParams,
} from '../../../utils/pagination'

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
  short_description: Enrichment['shortDescription']
  domain_registered_at: Enrichment['domainRegisteredAt']
  enriched_at: UserPlace['enriched_at']
  last_interaction_at: UserPlace['last_interaction_at']
  user_place_created_at: UserPlace['created_at']
  success: Enrichment['success']

  // Company enrichment fields
  workforce_range: string | null
  date_of_creation: Date | null
  company_activities: Array<{
    id: string
    code: string | null
    name: string | null
    type: string
  }>
  place_contacts: Array<{
    id: string
    firstName: string | null
    lastName: string | null
    role: string | null
    type: string | null
  }>
  company_technologies: string[]

  // For pagination - total count
  total_count?: number
}

// Options interface for the new API
export interface GetAggregatedUserPlacesOptions {
  userId: string
  searchId?: string
  listId?: string
  userPlaceId?: string
  filters?: ListContentFilters // listIds filtering is now part of filters.listIds
  pagination?: Partial<PaginationParams>
  sortBy?: string
  sortOrder?: SortOrder
}

// Result interface with pagination support
export interface GetAggregatedUserPlacesResult {
  items: PlaceApi[]
  total: number
}

/**
 * Internal implementation that supports both legacy and new API
 */
const getAggregatedUserPlacesInternal = async (
  options: GetAggregatedUserPlacesOptions,
): Promise<GetAggregatedUserPlacesResult> => {
  const {
    userId,
    searchId,
    listId,
    userPlaceId,
    filters,
    pagination,
    sortBy,
    sortOrder = 'desc',
  } = options

  // Determine mode: "all" (no scope), "scoped" (list or search), or "single" (userPlaceId)
  // Note: listIds filtering is now handled via filters.listIds in buildPlaceFilterConditions
  const isAllPlacesMode = !searchId && !listId && !userPlaceId
  const isSinglePlaceMode = !!userPlaceId && !searchId && !listId

  // When fetching all places or a single place, don't filter by search/list
  const searchCondition =
    isAllPlacesMode || isSinglePlaceMode
      ? sql``
      : searchId
        ? sql`AND s.id = ${searchId}`
        : sql`AND s.id IS NULL`

  // Build list condition for single listId scope (legacy behavior)
  // Multiple listIds filtering is now handled via filters.listIds in buildPlaceFilterConditions
  const listCondition =
    isAllPlacesMode || isSinglePlaceMode
      ? sql``
      : listId
        ? sql`AND l.id = ${listId}`
        : sql`AND l.id IS NULL`

  const userPlaceCondition = userPlaceId
    ? sql`AND up.id = ${userPlaceId}`
    : sql``

  // Build filter conditions
  const filterConditions = filters
    ? buildPlaceFilterConditions(filters)
    : sql`TRUE`

  // Build sort clause using shared configuration from @ritchy/types
  // This ensures consistent sorting between main query and item page lookup
  const effectiveSortBy = getEffectiveSortColumn(sortBy, searchId)
  const sortClause = buildSortClause(
    effectiveSortBy,
    sortOrder,
    USER_PLACES_DEFAULT_SORT.sortBy,
  )
  const sortClauseMain = buildSortClauseMain(
    effectiveSortBy,
    sortOrder,
    USER_PLACES_DEFAULT_SORT.sortBy,
  )

  // Build pagination clause
  const hasPagination = pagination !== undefined
  const safePagination = hasPagination
    ? getSafePaginationParams(pagination)
    : null
  const offset = safePagination ? calculateOffset(safePagination) : 0
  const limit = safePagination?.pageSize ?? null

  const paginationClause =
    limit !== null ? sql`LIMIT ${limit} OFFSET ${offset}` : sql``

  // For "all places" mode, use a simpler query that goes directly through user_place
  // This avoids the complex search/list joins and deduplicates naturally
  const filteredPlacesCTE = isAllPlacesMode
    ? sql`
    WITH all_places AS (
      SELECT DISTINCT ON (up.id)
        p.id as place_id,
        up.id as user_place_id,
        up.enriched_at,
        up.last_interaction_at,
        up.created_at as user_place_created_at,
        p.updated_at as place_updated_at,
        sts.status,
        e.id as enrichment_id,
        ec.id as enrichment_company_id
      FROM "user_place" up
      JOIN "place" p ON p.id = up.place_id
      LEFT JOIN "status" sts ON sts.user_place_id = up.id
      LEFT JOIN "enrichment" e ON e.place_id = p.id AND up.enriched_at IS NOT NULL
      LEFT JOIN "enrichment_company" ec ON ec.enrichment_id = e.id
      WHERE up.user_id = ${userId}
      AND p.is_deleted = false
      AND (${filterConditions})
      ORDER BY up.id, p.updated_at DESC
    ),
    filtered_places AS (
      SELECT
        ap.place_id,
        ap.user_place_id,
        ap.enriched_at,
        ap.last_interaction_at,
        ap.user_place_created_at,
        NULL::timestamp as list_place_created_at,
        NULL::timestamp as search_place_created_at,
        ap.status,
        ap.enrichment_id,
        ap.enrichment_company_id,
        COUNT(*) OVER() as total_count
      FROM all_places ap
      ORDER BY ${sortBy === 'lastInteractionAt' ? sql`ap.last_interaction_at` : sql`ap.user_place_created_at`} DESC NULLS LAST
      ${paginationClause}
    )`
    : sql`
    WITH filtered_places AS (
      SELECT
        p.id as place_id,
        up.id as user_place_id,
        up.enriched_at,
        up.last_interaction_at,
        up.created_at as user_place_created_at,
        lp.created_at as list_place_created_at,
        sp.created_at as search_place_created_at,
        sts.status,
        e.id as enrichment_id,
        ec.id as enrichment_company_id,
        COUNT(*) OVER() as total_count
      FROM "user" u
      LEFT JOIN "search" s ON s.user_id = u.id ${searchCondition}
      LEFT JOIN "search_place" sp ON sp.search_id = s.id
      LEFT JOIN "list" l ON l.user_id = u.id ${listCondition}
      LEFT JOIN "list_place" lp ON lp.list_id = l.id
      LEFT JOIN "user_place" up ON up.id = COALESCE(sp.user_place_id, lp.user_place_id)
      LEFT JOIN "place" p ON p.id = up.place_id
      LEFT JOIN "status" sts ON sts.user_place_id = up.id
      LEFT JOIN "enrichment" e ON e.place_id = p.id AND up.enriched_at IS NOT NULL
      LEFT JOIN "enrichment_company" ec ON ec.enrichment_id = e.id
      WHERE u.id = ${userId}
      AND (
        ${isSinglePlaceMode ? sql`up.id IS NOT NULL` : sql`(s.id IS NOT NULL OR l.id IS NOT NULL)`}
      )
      ${userPlaceCondition}
      AND p.is_deleted = false
      AND (${filterConditions})
      ORDER BY ${sortClause}
      ${paginationClause}
    )`

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
    ${filteredPlacesCTE}
    SELECT
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
      fp.user_place_id,
      fp.enriched_at,
      fp.last_interaction_at,
      fp.user_place_created_at,
      -- Debug: include timestamps for sorting
      fp.list_place_created_at,
      fp.search_place_created_at,
      -- Total count for pagination
      fp.total_count,
      -- Status
      CASE
        WHEN fp.status IS NULL THEN 'NEW'
        ELSE fp.status
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
      e.short_description,
      e.domain_registered_at,
      e.success,
      -- Company enrichment fields
      ec.workforce_range,
      ec.date_of_creation,
      COALESCE(activities_data.activities, '[]'::jsonb) as company_activities,
      COALESCE(contacts_lateral.contacts, '[]'::jsonb) as place_contacts,
      COALESCE(technologies_data.technologies, '[]'::jsonb) as company_technologies
    FROM filtered_places fp
    JOIN "place" p ON p.id = fp.place_id
    LEFT JOIN "enrichment" e ON e.id = fp.enrichment_id
    LEFT JOIN "enrichment_company" ec ON ec.id = fp.enrichment_company_id
    LEFT JOIN LATERAL (
      SELECT
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', n.id,
            'note', n.note,
            'userId', n.user_id,
            'userPlaceId', n.user_place_id,
            'createdAt', n.created_at,
            'updatedAt', n.updated_at
          ) ORDER BY n.created_at DESC
        ) FILTER (WHERE n.id IS NOT NULL) as notes
      FROM note n
      WHERE n.user_place_id = fp.user_place_id
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
      WHERE all_lp.user_place_id = fp.user_place_id
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
      WHERE c.user_place_id = fp.user_place_id
    ) contacts_data ON true
    LEFT JOIN LATERAL (
      SELECT
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', eca.id,
            'code', eca.code,
            'name', eca.name,
            'type', eca.type
          )
        ) FILTER (WHERE eca.id IS NOT NULL) as activities
      FROM enrichment_company_activity eca
      WHERE eca.company_id = ec.id
    ) activities_data ON true
    LEFT JOIN LATERAL (
      SELECT
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', c.id,
            'firstName', c.first_name,
            'lastName', c.last_name,
            'role', eco.role,
            'type', c.type
          )
        ) FILTER (WHERE c.id IS NOT NULL) as contacts
      FROM contact c
      LEFT JOIN enrichment_company_officer eco ON eco.id = c.officer_id
      WHERE c.user_place_id = fp.user_place_id
      AND c.type = 'physical'
    ) contacts_lateral ON true
    LEFT JOIN LATERAL (
      SELECT
        JSONB_AGG(DISTINCT et.technology) FILTER (WHERE et.technology IS NOT NULL) as technologies
      FROM enrichment_technology et
      WHERE et.enrichment_id = e.id
    ) technologies_data ON true
    ORDER BY ${sortClauseMain}
  `

  const result = (await db.execute(query)) as unknown as AggregatedUserPlace[]

  // Get total count from first row (all rows have the same total_count via window function)
  const total = result.length > 0 ? Number(result[0].total_count) || 0 : 0

  const items = result.map((row) => {
    // Calculate enriched status based on enrichment success and timing
    let enrichedStatus: EnrichedStatus | null = null

    if (row.enriched_at && row.success !== undefined) {
      if (row.success === false) {
        enrichedStatus = 'ENRICHMENT_ERROR'
      } else if (row.success === true) {
        const nowUtc = Date.now()
        const thirtyMinutesInMs = 30 * 60 * 1000

        // Convert enriched_at to UTC timestamp
        // PostgreSQL timestamp is already UTC, so append 'Z' to indicate this
        let enrichedAtUtc: number
        if (row.enriched_at instanceof Date) {
          enrichedAtUtc = row.enriched_at.getTime()
        } else {
          // Add 'Z' to indicate UTC timezone, or replace space with 'T' and add 'Z'
          const utcString = `${String(row.enriched_at).replace(' ', 'T')}Z`
          enrichedAtUtc = new Date(utcString).getTime()
        }

        // Compare timestamps directly (both in UTC milliseconds)
        const isRecentlyEnriched = nowUtc - enrichedAtUtc < thirtyMinutesInMs

        enrichedStatus = isRecentlyEnriched ? 'RECENTLY_ENRICHED' : 'ENRICHED'
      }
    }

    return {
      id: row.user_place_id,
      name: row.name ?? '',
      sourceId: row.source_id,
      source: row.source,
      sourceUrl: row.source_url,
      location: row.location ?? { latitude: 0, longitude: 0 },
      website: row.website ?? undefined,
      types: row.types ?? [],
      primaryType: row.primary_type ?? undefined,
      priceLevel: row.price_level ?? undefined,
      priceRange: row.price_range ?? undefined,
      rating: row.rating ?? undefined,
      ratingCount: row.rating_count ?? undefined,
      utcOffsetMinutes: row.utc_offset_minutes ?? 0,
      phone: row.phone ?? undefined,
      isDeleted: row.is_deleted ?? false,
      address: {
        formattedAddress: row.formatted_address ?? undefined,
        shortFormattedAddress: row.short_formatted_address ?? undefined,
        country: row.country ?? undefined,
        locality: row.locality ?? undefined,
        sublocality: row.sublocality ?? undefined,
        postalCode: row.postal_code ?? undefined,
        postalCodeSuffix: row.postal_code_suffix ?? undefined,
        plusCode: row.plus_code ?? undefined,
        street: row.street ?? undefined,
        streetNumber: row.street_number ?? undefined,
        neighborhood: row.neighborhood ?? undefined,
        administrativeAreaLevel1: row.administrative_area_level_1 ?? undefined,
        administrativeAreaLevel2: row.administrative_area_level_2 ?? undefined,
        administrativeAreaLevel3: row.administrative_area_level_3 ?? undefined,
      },
      openingHours: row.opening_hours ?? undefined,
      listId: listId ?? null,
      lists: row.lists,
      notes: (row.notes ?? []).map((note) => ({
        id: note.id,
        userPlaceId: note.userPlaceId,
        note: note.note,
        userId: note.userId,
        createdAt:
          note.createdAt instanceof Date
            ? note.createdAt
            : new Date(note.createdAt),
        updatedAt:
          note.updatedAt instanceof Date
            ? note.updatedAt
            : new Date(note.updatedAt),
      })),
      status: row.status,
      createdAt:
        row.user_place_created_at instanceof Date
          ? row.user_place_created_at
          : new Date(row.user_place_created_at),
      lastInteractionAt: row.last_interaction_at
        ? row.last_interaction_at instanceof Date
          ? row.last_interaction_at
          : new Date(row.last_interaction_at)
        : null,
      domainRegisteredAt: row.domain_registered_at,
      shortDescription: row.short_description,
      contactEmails: (row.contact_emails ?? []).map((email) => ({
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
      contactPhones: row.contact_phones ?? [],
      contactLinkedins: row.contact_linkedins ?? [],
      contactInstagrams: row.contact_instagrams ?? [],
      contactFacebooks: row.contact_facebooks ?? [],
      hubspotSynced: false,
      enrichedStatus,
      companyWorkforceRange: row.workforce_range ?? null,
      companyDateOfCreation: row.date_of_creation ?? null,
      companyActivities: row.company_activities ?? [],
      placeContacts: row.place_contacts ?? [],
      companyTechnologies: (row.company_technologies ?? []) as string[],
    }
  })

  return { items, total }
}

/**
 * Get aggregated user places with optional filtering, sorting, and pagination
 */
export const getAggregatedUserPlaces = (
  options: GetAggregatedUserPlacesOptions,
): Promise<GetAggregatedUserPlacesResult> => {
  return getAggregatedUserPlacesInternal(options)
}

/**
 * Get just the IDs of filtered places in order (for page lookup)
 * Uses shared sort configuration from @ritchy/types to ensure consistency
 * with getAggregatedUserPlacesInternal
 */
export const getFilteredPlaceIds = async (
  options: Omit<GetAggregatedUserPlacesOptions, 'pagination'>,
): Promise<string[]> => {
  const {
    userId,
    searchId,
    listId,
    filters,
    sortBy,
    sortOrder = USER_PLACES_DEFAULT_SORT.sortOrder,
  } = options

  // Determine mode
  const isAllPlacesMode = !searchId && !listId

  // Build filter conditions
  const filterConditions = filters
    ? buildPlaceFilterConditions(filters)
    : sql`TRUE`

  // Use shared sort configuration from @ritchy/types
  // This ensures consistency with getAggregatedUserPlacesInternal
  const effectiveSortBy = getEffectiveSortColumn(sortBy, searchId)
  const sortClause = buildSortClause(
    effectiveSortBy,
    sortOrder,
    USER_PLACES_DEFAULT_SORT.sortBy,
  )

  // For "all places" mode, query directly through user_place
  if (isAllPlacesMode) {
    const query = sql`
      SELECT DISTINCT ON (up.id)
        up.id as user_place_id,
        up.created_at as user_place_created_at,
        up.last_interaction_at,
        p.updated_at
      FROM "user_place" up
      JOIN "place" p ON p.id = up.place_id
      LEFT JOIN "status" sts ON sts.user_place_id = up.id
      LEFT JOIN "enrichment" e ON e.place_id = p.id AND up.enriched_at IS NOT NULL
      LEFT JOIN "enrichment_company" ec ON ec.enrichment_id = e.id
      WHERE up.user_id = ${userId}
      AND p.is_deleted = false
      AND (${filterConditions})
      ORDER BY up.id, p.updated_at DESC
    `

    const innerResult = (await db.execute(query)) as unknown as Array<{
      user_place_id: string
      user_place_created_at: Date
      last_interaction_at: Date | null
      updated_at: Date
    }>

    // Sort after deduplication using same logic as main query
    return innerResult
      .sort((a, b) => {
        const aVal =
          sortBy === 'lastInteractionAt'
            ? a.last_interaction_at
            : a.user_place_created_at
        const bVal =
          sortBy === 'lastInteractionAt'
            ? b.last_interaction_at
            : b.user_place_created_at

        // Handle nulls - NULLS LAST for DESC
        if (!aVal && !bVal) return 0
        if (!aVal) return sortOrder === 'desc' ? 1 : -1
        if (!bVal) return sortOrder === 'desc' ? -1 : 1

        const aTime = new Date(aVal).getTime()
        const bTime = new Date(bVal).getTime()
        return sortOrder === 'desc' ? bTime - aTime : aTime - bTime
      })
      .map((row) => row.user_place_id)
  }

  // For scoped mode (list or search)
  const searchCondition = searchId
    ? sql`AND s.id = ${searchId}`
    : sql`AND s.id IS NULL`

  const listCondition = listId
    ? sql`AND l.id = ${listId}`
    : sql`AND l.id IS NULL`

  const query = sql`
    SELECT up.id as user_place_id
    FROM "user" u
    LEFT JOIN "search" s ON s.user_id = u.id ${searchCondition}
    LEFT JOIN "search_place" sp ON sp.search_id = s.id
    LEFT JOIN "list" l ON l.user_id = u.id ${listCondition}
    LEFT JOIN "list_place" lp ON lp.list_id = l.id
    LEFT JOIN "user_place" up ON up.id = COALESCE(sp.user_place_id, lp.user_place_id)
    LEFT JOIN "place" p ON p.id = up.place_id
    LEFT JOIN "status" sts ON sts.user_place_id = up.id
    LEFT JOIN "enrichment" e ON e.place_id = p.id AND up.enriched_at IS NOT NULL
    LEFT JOIN "enrichment_company" ec ON ec.enrichment_id = e.id
    WHERE u.id = ${userId}
    AND (s.id IS NOT NULL OR l.id IS NOT NULL)
    AND p.is_deleted = false
    AND (${filterConditions})
    ORDER BY ${sortClause}
  `

  const result = (await db.execute(query)) as unknown as Array<{
    user_place_id: string
  }>

  return result.map((row) => row.user_place_id)
}
