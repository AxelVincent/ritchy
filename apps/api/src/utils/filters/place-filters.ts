import type { ListContentFilters, SortOrder } from '@ritchy/types'
import { type SQL, sql } from 'drizzle-orm'

/**
 * Build SQL WHERE conditions from ListContentFilters
 * Returns SQL fragment to be used in WHERE clause
 */
export const buildPlaceFilterConditions = (
  filters: ListContentFilters,
): SQL => {
  const conditions: SQL[] = []

  // List filter - filter by places belonging to specific lists
  if (filters.listIds && filters.listIds.length > 0) {
    const listIdPlaceholders = filters.listIds.map((id) => sql`${id}`)
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM list_place lp_filter
        WHERE lp_filter.user_place_id = up.id
        AND lp_filter.list_id IN (${sql.join(listIdPlaceholders, sql`, `)})
      )`,
    )
  }

  // Text filters (ILIKE for case-insensitive partial match)
  if (filters.search) {
    // Global search across multiple fields
    conditions.push(
      sql`(
        p.name ILIKE ${`%${filters.search}%`}
        OR p.formatted_address ILIKE ${`%${filters.search}%`}
        OR p.website ILIKE ${`%${filters.search}%`}
      )`,
    )
  }

  if (filters.name) {
    conditions.push(sql`p.name ILIKE ${`%${filters.name}%`}`)
  }

  if (filters.country && filters.country.length > 0) {
    const countryPlaceholders = filters.country.map((c) => sql`${c}`)
    conditions.push(
      sql`p.country IN (${sql.join(countryPlaceholders, sql`, `)})`,
    )
  }

  if (filters.locality && filters.locality.length > 0) {
    const localityPlaceholders = filters.locality.map((l) => sql`${l}`)
    conditions.push(
      sql`p.locality IN (${sql.join(localityPlaceholders, sql`, `)})`,
    )
  }

  if (filters.postalCode) {
    conditions.push(sql`p.postal_code ILIKE ${`%${filters.postalCode}%`}`)
  }

  if (filters.street) {
    conditions.push(sql`p.street ILIKE ${`%${filters.street}%`}`)
  }

  if (filters.website) {
    conditions.push(sql`p.website ILIKE ${`%${filters.website}%`}`)
  }

  if (filters.phone) {
    conditions.push(sql`p.phone ILIKE ${`%${filters.phone}%`}`)
  }

  // Social media filters (subquery on enrichment_* tables)
  if (filters.facebookUrl) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM enrichment_facebook ef
        WHERE ef.enrichment_id = e.id
        AND ef.url ILIKE ${`%${filters.facebookUrl}%`}
      )`,
    )
  }

  if (filters.instagramUrl) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM enrichment_instagram ei
        WHERE ei.enrichment_id = e.id
        AND ei.url ILIKE ${`%${filters.instagramUrl}%`}
      )`,
    )
  }

  if (filters.linkedinUrl) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM enrichment_linkedin el
        WHERE el.enrichment_id = e.id
        AND el.url ILIKE ${`%${filters.linkedinUrl}%`}
      )`,
    )
  }

  if (filters.shortDescription) {
    conditions.push(
      sql`e.short_description ILIKE ${`%${filters.shortDescription}%`}`,
    )
  }

  if (filters.sourceUrl) {
    conditions.push(sql`p.source_url ILIKE ${`%${filters.sourceUrl}%`}`)
  }

  // Email filter (subquery on contacts)
  if (filters.email) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM contact c
        JOIN contact_email ce ON ce.contact_id = c.id
        WHERE c.user_place_id = up.id
        AND ce.email ILIKE ${`%${filters.email}%`}
      )`,
    )
  }

  // Multi-select filters (WHERE IN)
  if (filters.status && filters.status.length > 0) {
    const statusPlaceholders = filters.status.map((s) => sql`${s}`)
    conditions.push(
      sql`COALESCE(sts.status, 'NEW') IN (${sql.join(statusPlaceholders, sql`, `)})`,
    )
  }

  if (filters.primaryType && filters.primaryType.length > 0) {
    const typePlaceholders = filters.primaryType.map((t) => sql`${t}`)
    conditions.push(
      sql`p.primary_type IN (${sql.join(typePlaceholders, sql`, `)})`,
    )
  }

  if (filters.types && filters.types.length > 0) {
    // Check if any of the filter types are in the place's types array
    const typePlaceholders = filters.types.map((t) => sql`${t}`)
    conditions.push(
      sql`p.types && ARRAY[${sql.join(typePlaceholders, sql`, `)}]::text[]`,
    )
  }

  if (filters.workforceRange && filters.workforceRange.length > 0) {
    const workforcePlaceholders = filters.workforceRange.map((w) => sql`${w}`)
    conditions.push(
      sql`ec.workforce_range IN (${sql.join(workforcePlaceholders, sql`, `)})`,
    )
  }

  if (filters.source && filters.source.length > 0) {
    const sourcePlaceholders = filters.source.map((s) => sql`${s}`)
    conditions.push(sql`p.source IN (${sql.join(sourcePlaceholders, sql`, `)})`)
  }

  if (filters.priceLevel && filters.priceLevel.length > 0) {
    const priceLevelPlaceholders = filters.priceLevel.map((pl) => sql`${pl}`)
    conditions.push(
      sql`p.price_level IN (${sql.join(priceLevelPlaceholders, sql`, `)})`,
    )
  }

  // Technologies filter (subquery on enrichment_technology)
  if (filters.technologies && filters.technologies.length > 0) {
    const techPlaceholders = filters.technologies.map((t) => sql`${t}`)
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM enrichment_technology et
        WHERE et.enrichment_id = e.id
        AND et.technology IN (${sql.join(techPlaceholders, sql`, `)})
      )`,
    )
  }

  // Range filters
  if (filters.ratingMin !== undefined) {
    conditions.push(sql`p.rating >= ${filters.ratingMin}`)
  }

  if (filters.ratingMax !== undefined) {
    conditions.push(sql`p.rating <= ${filters.ratingMax}`)
  }

  if (filters.ratingCountMin !== undefined) {
    conditions.push(sql`p.rating_count >= ${filters.ratingCountMin}`)
  }

  if (filters.ratingCountMax !== undefined) {
    conditions.push(sql`p.rating_count <= ${filters.ratingCountMax}`)
  }

  // Date range filters
  if (filters.dateOfCreationFrom) {
    conditions.push(sql`ec.date_of_creation >= ${filters.dateOfCreationFrom}`)
  }

  if (filters.dateOfCreationTo) {
    conditions.push(sql`ec.date_of_creation <= ${filters.dateOfCreationTo}`)
  }

  if (filters.domainRegisteredAtFrom) {
    conditions.push(
      sql`e.domain_registered_at >= ${filters.domainRegisteredAtFrom}`,
    )
  }

  if (filters.domainRegisteredAtTo) {
    conditions.push(
      sql`e.domain_registered_at <= ${filters.domainRegisteredAtTo}`,
    )
  }

  if (filters.lastInteractionAtFrom) {
    conditions.push(
      sql`up.last_interaction_at >= ${filters.lastInteractionAtFrom}`,
    )
  }

  if (filters.lastInteractionAtTo) {
    conditions.push(
      sql`up.last_interaction_at <= ${filters.lastInteractionAtTo}`,
    )
  }

  // Return combined conditions or TRUE if no filters
  return conditions.length > 0 ? sql.join(conditions, sql` AND `) : sql`TRUE`
}

/**
 * Valid sort columns mapping from API field names to SQL columns
 * Used in the CTE where original table aliases are available
 */
const VALID_SORT_COLUMNS_CTE: Record<string, SQL> = {
  name: sql`p.name`,
  rating: sql`p.rating`,
  ratingCount: sql`p.rating_count`,
  status: sql`COALESCE(sts.status, 'NEW')`,
  country: sql`p.country`,
  locality: sql`p.locality`,
  postalCode: sql`p.postal_code`,
  createdAt: sql`up.created_at`,
  updatedAt: sql`p.updated_at`,
  lastInteractionAt: sql`up.last_interaction_at`,
  dateOfCreation: sql`ec.date_of_creation`,
  domainRegisteredAt: sql`e.domain_registered_at`,
  workforceRange: sql`ec.workforce_range`,
  primaryType: sql`p.primary_type`,
  website: sql`p.website`,
  searchPlaceCreatedAt: sql`sp.created_at`,
}

/**
 * Valid sort columns for the main query (after CTE)
 * References aliased columns from filtered_places CTE
 */
const VALID_SORT_COLUMNS_MAIN: Record<string, SQL> = {
  name: sql`p.name`,
  rating: sql`p.rating`,
  ratingCount: sql`p.rating_count`,
  status: sql`COALESCE(fp.status, 'NEW')`,
  country: sql`p.country`,
  locality: sql`p.locality`,
  postalCode: sql`p.postal_code`,
  createdAt: sql`fp.user_place_created_at`,
  updatedAt: sql`p.updated_at`,
  lastInteractionAt: sql`fp.last_interaction_at`,
  dateOfCreation: sql`ec.date_of_creation`,
  domainRegisteredAt: sql`e.domain_registered_at`,
  workforceRange: sql`ec.workforce_range`,
  primaryType: sql`p.primary_type`,
  website: sql`p.website`,
  searchPlaceCreatedAt: sql`fp.search_place_created_at`,
}

/**
 * Build SQL ORDER BY clause from sort parameters (for CTE)
 * @param sortBy - Column to sort by
 * @param sortOrder - Sort order (asc/desc)
 * @param defaultSortBy - Default column if sortBy is not specified (defaults to 'lastInteractionAt')
 */
export const buildSortClause = (
  sortBy?: string,
  sortOrder: SortOrder = 'asc',
  defaultSortBy = 'lastInteractionAt',
): SQL => {
  const column =
    VALID_SORT_COLUMNS_CTE[sortBy ?? defaultSortBy] ??
    VALID_SORT_COLUMNS_CTE[defaultSortBy]

  return sortOrder === 'desc'
    ? sql`${column} DESC NULLS LAST`
    : sql`${column} ASC NULLS LAST`
}

/**
 * Build SQL ORDER BY clause for the main query (after CTE)
 * Uses aliased columns from filtered_places
 * @param sortBy - Column to sort by
 * @param sortOrder - Sort order (asc/desc)
 * @param defaultSortBy - Default column if sortBy is not specified (defaults to 'lastInteractionAt')
 */
export const buildSortClauseMain = (
  sortBy?: string,
  sortOrder: SortOrder = 'asc',
  defaultSortBy = 'lastInteractionAt',
): SQL => {
  const column =
    VALID_SORT_COLUMNS_MAIN[sortBy ?? defaultSortBy] ??
    VALID_SORT_COLUMNS_MAIN[defaultSortBy]

  return sortOrder === 'desc'
    ? sql`${column} DESC NULLS LAST`
    : sql`${column} ASC NULLS LAST`
}

/**
 * Get list of valid sort column names for validation
 */
export const getValidSortColumns = (): string[] => {
  return Object.keys(VALID_SORT_COLUMNS_CTE)
}
