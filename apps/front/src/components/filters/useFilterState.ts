import type {
  FilterRule,
  ListContentFilters,
  PaginationParams,
} from '@api/shared'
import {
  deserializeFiltersFromParams,
  serializeFiltersToParams,
} from '@api/shared'
import type { SortingState } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'

// Search params for the leads route
// Filter params are dynamic: [property].op, [property].v, [property].v2
// Examples: status.op, status.v, rating.op, rating.v, rating.v2
export interface LeadsSearchParams {
  // Scope params (optional)
  listId?: string // Legacy single list scope (will redirect)
  searchId?: string // Search scope for historical searches

  // Pagination
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'

  // Dynamic filter params - uses index signature
  // Note: string | number | undefined to allow page/pageSize numbers
  [key: string]: string | number | undefined
}

// ============================================
// CONVERSION: FilterRule[] <-> ListContentFilters
// ============================================

/**
 * Convert FilterRule[] to ListContentFilters for API requests
 * This bridges the new filter system with the existing API
 */
export const filterRulesToApiFilters = (
  rules: FilterRule[],
): ListContentFilters => {
  const filters: ListContentFilters = {}

  for (const rule of rules) {
    switch (rule.type) {
      case 'text': {
        if (!rule.value) continue

        // Map text operators to API format
        // For Phase 1, we support ILIKE (contains) and semantic_match
        switch (rule.property) {
          case 'semanticQuery':
            // Semantic search uses the value directly
            if (rule.operator === 'semantic_match') {
              filters.semanticQuery = rule.value
            }
            break
          case 'name':
            filters.name = rule.value
            break
          case 'postalCode':
            filters.postalCode = rule.value
            break
          case 'street':
            filters.street = rule.value
            break
          case 'website':
            filters.website = rule.value
            break
          case 'phone':
            filters.phone = rule.value
            break
          case 'facebookUrl':
            filters.facebookUrl = rule.value
            break
          case 'instagramUrl':
            filters.instagramUrl = rule.value
            break
          case 'linkedinUrl':
            filters.linkedinUrl = rule.value
            break
          case 'email':
            filters.email = rule.value
            break
          case 'shortDescription':
            filters.shortDescription = rule.value
            break
          case 'sourceUrl':
            filters.sourceUrl = rule.value
            break
        }
        break
      }

      case 'number': {
        // Map number rules to min/max filters
        // For Phase 1, we map operators to range boundaries
        switch (rule.property) {
          case 'rating': {
            if (rule.operator === 'between') {
              if (rule.value !== undefined) filters.ratingMin = rule.value
              if (rule.valueTo !== undefined) filters.ratingMax = rule.valueTo
            } else if (
              rule.operator === 'greater_than' ||
              rule.operator === 'greater_than_or_equal'
            ) {
              filters.ratingMin = rule.value
            } else if (
              rule.operator === 'less_than' ||
              rule.operator === 'less_than_or_equal'
            ) {
              filters.ratingMax = rule.value
            } else if (rule.operator === 'equals') {
              filters.ratingMin = rule.value
              filters.ratingMax = rule.value
            }
            break
          }
          case 'ratingCount': {
            if (rule.operator === 'between') {
              if (rule.value !== undefined) filters.ratingCountMin = rule.value
              if (rule.valueTo !== undefined)
                filters.ratingCountMax = rule.valueTo
            } else if (
              rule.operator === 'greater_than' ||
              rule.operator === 'greater_than_or_equal'
            ) {
              filters.ratingCountMin = rule.value
            } else if (
              rule.operator === 'less_than' ||
              rule.operator === 'less_than_or_equal'
            ) {
              filters.ratingCountMax = rule.value
            } else if (rule.operator === 'equals') {
              filters.ratingCountMin = rule.value
              filters.ratingCountMax = rule.value
            }
            break
          }
        }
        break
      }

      case 'multi_select': {
        if (!rule.values?.length) continue

        // Map multi-select rules to array filters
        // For Phase 1, we only support is_any_of (IN clause)
        switch (rule.property) {
          case 'listIds':
            filters.listIds = rule.values
            break
          case 'country':
            filters.country = rule.values
            break
          case 'locality':
            filters.locality = rule.values
            break
          case 'status':
            filters.status = rule.values
            break
          case 'primaryType':
            filters.primaryType = rule.values
            break
          case 'types':
            filters.types = rule.values
            break
          case 'workforceRange':
            filters.workforceRange = rule.values
            break
          case 'source':
            filters.source = rule.values
            break
          case 'priceLevel':
            filters.priceLevel = rule.values
            break
          case 'technologies':
            filters.technologies = rule.values
            break
        }
        break
      }

      case 'date': {
        // Map date rules to from/to filters
        switch (rule.property) {
          case 'dateOfCreation': {
            if (
              rule.operator === 'is_between' ||
              rule.operator === 'is_after' ||
              rule.operator === 'is_on_or_after'
            ) {
              filters.dateOfCreationFrom = rule.value
            }
            if (
              rule.operator === 'is_between' ||
              rule.operator === 'is_before' ||
              rule.operator === 'is_on_or_before'
            ) {
              filters.dateOfCreationTo = rule.valueTo ?? rule.value
            }
            break
          }
          case 'domainRegisteredAt': {
            if (
              rule.operator === 'is_between' ||
              rule.operator === 'is_after' ||
              rule.operator === 'is_on_or_after'
            ) {
              filters.domainRegisteredAtFrom = rule.value
            }
            if (
              rule.operator === 'is_between' ||
              rule.operator === 'is_before' ||
              rule.operator === 'is_on_or_before'
            ) {
              filters.domainRegisteredAtTo = rule.valueTo ?? rule.value
            }
            break
          }
        }
        break
      }

      case 'boolean': {
        // Boolean filters are deprecated - use is_empty/is_not_empty on text fields instead
        break
      }
    }
  }

  return filters
}

/**
 * Extract listIds from filter rules
 * @deprecated listIds is now part of apiFilters. Use apiFilters.listIds instead.
 */
export const extractListIdsFromRules = (rules: FilterRule[]): string[] => {
  const listIdsRule = rules.find(
    (r) => r.property === 'listIds' && r.type === 'multi_select',
  )
  if (listIdsRule && listIdsRule.type === 'multi_select') {
    return listIdsRule.values ?? []
  }
  return []
}

// ============================================
// URL SERIALIZATION
// ============================================

/**
 * Serialize filter rules to URL search params
 * Returns individual params like status.op, status.v, etc.
 */
export const rulesToSearchParams = (
  rules: FilterRule[],
): Partial<LeadsSearchParams> => {
  if (rules.length === 0) return {}
  return serializeFiltersToParams(rules)
}

/**
 * Deserialize filter rules from URL search params
 * Reads individual params like status.op, status.v, etc.
 */
export const searchParamsToRules = (
  search: LeadsSearchParams,
): FilterRule[] => {
  // Convert search params to Record<string, string | undefined>
  const params: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(search)) {
    if (key.includes('.')) {
      params[key] = value !== undefined ? String(value) : undefined
    }
  }
  return deserializeFiltersFromParams(params)
}

// ============================================
// SORTING
// ============================================

/**
 * Convert TanStack SortingState to API params
 */
export const sortingToApiParams = (
  sorting: SortingState,
): Pick<PaginationParams, 'sortBy' | 'sortOrder'> => {
  if (sorting.length === 0) {
    return { sortBy: undefined, sortOrder: 'asc' }
  }
  const [first] = sorting
  return {
    sortBy: first.id,
    sortOrder: first.desc ? 'desc' : 'asc',
  }
}

/**
 * Convert API params to TanStack SortingState
 */
export const apiParamsToSorting = (
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
): SortingState => {
  if (!sortBy) return []
  return [{ id: sortBy, desc: sortOrder === 'desc' }]
}

// ============================================
// MAIN HOOK
// ============================================

interface UseFilterStateOptions {
  search: LeadsSearchParams
  navigate: (options: {
    search: (prev: LeadsSearchParams) => LeadsSearchParams
    replace?: boolean
  }) => void
}

/**
 * Hook to manage URL-synced filter state using the new filter rule system
 */
export const useFilterState = ({ search, navigate }: UseFilterStateOptions) => {
  // Parse filter rules from URL
  const rules = useMemo(() => searchParamsToRules(search), [search])

  // Convert rules to API filters
  const apiFilters = useMemo(() => filterRulesToApiFilters(rules), [rules])

  // Extract listIds for query scope
  const listIds = useMemo(() => extractListIdsFromRules(rules), [rules])

  // Check if semantic search filter is active
  const hasSemanticFilter = useMemo(
    () =>
      rules.some((r) => r.property === 'semanticQuery' && r.type === 'text'),
    [rules],
  )

  // Determine default sort based on view type:
  // - Semantic search active: default to relevance
  // - Search view (searchId present): default to createdAt (enrichment score order)
  // - Other views (lists, all places): default to lastInteractionAt
  const defaultSortBy = hasSemanticFilter
    ? 'relevance'
    : search.searchId
      ? 'createdAt'
      : 'lastInteractionAt'

  // Pagination params
  const pagination = useMemo(
    (): PaginationParams => ({
      page: search.page ?? 1,
      pageSize: search.pageSize ?? 50,
      sortBy: search.sortBy ?? defaultSortBy,
      sortOrder: search.sortOrder ?? 'desc',
    }),
    [
      search.page,
      search.pageSize,
      search.sortBy,
      search.sortOrder,
      defaultSortBy,
    ],
  )

  // Sorting state for TanStack Table
  const sorting = useMemo(
    () =>
      apiParamsToSorting(
        search.sortBy ?? defaultSortBy,
        search.sortOrder ?? 'desc',
      ),
    [search.sortBy, search.sortOrder, defaultSortBy],
  )

  // Update filter rules
  const setRules = useCallback(
    (newRules: FilterRule[]) => {
      navigate({
        search: (prev) => {
          // Remove all existing filter params (keys containing '.')
          const cleanedPrev: LeadsSearchParams = {}
          for (const [key, value] of Object.entries(prev)) {
            if (!key.includes('.')) {
              cleanedPrev[key] = value
            }
          }
          // Add new filter params
          const filterParams = serializeFiltersToParams(newRules)
          return {
            ...cleanedPrev,
            ...filterParams,
            page: 1, // Reset to page 1 when filters change
          }
        },
        replace: true,
      })
    },
    [navigate],
  )

  // Update page
  const setPage = useCallback(
    (page: number) => {
      navigate({
        search: (prev) => ({ ...prev, page }),
        replace: true,
      })
    },
    [navigate],
  )

  // Update page size
  const setPageSize = useCallback(
    (pageSize: number) => {
      navigate({
        search: (prev) => ({ ...prev, pageSize, page: 1 }),
        replace: true,
      })
    },
    [navigate],
  )

  // Update sorting
  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      const { sortBy, sortOrder } = sortingToApiParams(newSorting)
      navigate({
        search: (prev) => ({
          ...prev,
          sortBy,
          sortOrder,
          page: 1,
        }),
        replace: true,
      })
    },
    [navigate],
  )

  return {
    // Filter rules (for FilterBar)
    rules,
    setRules,

    // API-ready state
    apiFilters,
    listIds,
    pagination,

    // TanStack Table state
    sorting,

    // Setters
    setPage,
    setPageSize,
    handleSortingChange,

    // State flags
    hasSemanticFilter, // True when semantic search filter is active

    // Legacy: searchId from URL (for historical search scoping)
    searchId: search.searchId,
  }
}
