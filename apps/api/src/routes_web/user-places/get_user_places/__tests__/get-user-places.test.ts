import { createIntegrationTestSuite } from '../../../../__tests__/integration/utils/create-integration-test-suite'
import * as cases from './cases'

createIntegrationTestSuite(
  { name: 'GET /user-places' },

  // ==========================================================================
  // SCOPE & AUTHORIZATION (High Priority)
  // ==========================================================================
  {
    when: 'scoping by listId',
    should: 'return only places from that list',
    run: cases.scopeByListId,
  },
  {
    when: 'scoping by searchId',
    should: 'return only places from that search',
    run: cases.scopeBySearchId,
  },
  {
    when: 'requesting a non-existent list',
    should: 'return 404 error',
    run: cases.scopeListNotFound,
  },
  {
    when: 'requesting a non-existent search',
    should: 'return 404 error',
    run: cases.scopeSearchNotFound,
  },
  {
    when: 'requesting another user list',
    should: 'return 404 to avoid leaking existence',
    run: cases.scopeListWrongUser,
  },
  {
    when: 'requesting another user search',
    should: 'return 404 to avoid leaking existence',
    run: cases.scopeSearchWrongUser,
  },
  {
    when: 'requesting without scope params',
    should: 'return all user places',
    run: cases.scopeAllPlaces,
  },

  // ==========================================================================
  // VALIDATION & ERROR HANDLING
  // ==========================================================================
  {
    when: 'providing invalid listId format',
    should: 'return 400 with validation error',
    run: cases.invalidListIdFormat,
  },
  {
    when: 'providing invalid searchId format',
    should: 'return 400 with validation error',
    run: cases.invalidSearchIdFormat,
  },
  {
    when: 'providing page number less than 1',
    should: 'return 400 with validation error',
    run: cases.invalidPageNumber,
  },
  {
    when: 'providing pageSize exceeding max (100)',
    should: 'return 400 with validation error',
    run: cases.invalidPageSizeExceedsMax,
  },
  {
    when: 'providing ratingMin exceeding max (5)',
    should: 'return 400 with validation error',
    run: cases.invalidRatingMinExceedsMax,
  },
  {
    when: 'providing negative ratingMax',
    should: 'return 400 with validation error',
    run: cases.invalidRatingMaxBelowMin,
  },
  {
    when: 'providing invalid sortOrder value',
    should: 'return 400 with validation error',
    run: cases.invalidSortOrder,
  },
  {
    when: 'providing negative ratingCountMin',
    should: 'return 400 with validation error',
    run: cases.invalidRatingCountMinNegative,
  },

  // ==========================================================================
  // CONTEXT METADATA
  // ==========================================================================
  {
    when: 'querying all places (no scope)',
    should: 'return context with type "all"',
    run: cases.contextTypeAll,
  },
  {
    when: 'querying places scoped to a list',
    should: 'return context with type "list" and list metadata',
    run: cases.contextTypeList,
  },
  {
    when: 'querying places scoped to a search',
    should: 'return context with type "search" and search metadata',
    run: cases.contextTypeSearch,
  },

  // ==========================================================================
  // LIST IDS FILTERS
  // ==========================================================================
  {
    when: 'filtering by multiple list IDs',
    should: 'return only places from those lists',
    run: cases.filterByMultipleListIds,
  },
  {
    when: 'filtering by single list ID using array format',
    should: 'return only places from that list',
    run: cases.filterBySingleListIdArray,
  },
  {
    when: 'filtering by list IDs combined with other filters',
    should: 'apply both list and other filters',
    run: cases.filterByListIdsWithOtherFilters,
  },
  {
    when: 'filtering with empty list IDs array',
    should: 'return all places',
    run: cases.filterByEmptyListIds,
  },
  {
    when: 'filtering by non-existent list ID',
    should: 'return empty results',
    run: cases.filterByNonExistentListId,
  },

  // ==========================================================================
  // COUNTRY FILTERS
  // ==========================================================================
  {
    when: 'filtering by single country',
    should: 'returns only places from that country',
    run: cases.filterBySingleCountry,
  },
  {
    when: 'filtering by multiple countries',
    should: 'returns places from all specified countries',
    run: cases.filterByMultipleCountries,
  },

  // Name filter
  {
    when: 'filtering by name',
    should: 'returns places with matching name (partial match)',
    run: cases.filterByName,
  },
  {
    when: 'filtering by name with different case',
    should: 'returns places with matching name (case-insensitive)',
    run: cases.filterByNameCaseInsensitive,
  },

  // Status filter
  {
    when: 'filtering by single status',
    should: 'returns only places with that status',
    run: cases.filterByStatus,
  },
  {
    when: 'filtering by multiple statuses',
    should: 'returns places with any of the statuses',
    run: cases.filterByMultipleStatuses,
  },
  {
    when: 'filtering for NEW status on places without explicit status',
    should: 'returns places that default to NEW',
    run: cases.filterByDefaultStatus,
  },

  // Rating filters
  {
    when: 'filtering by rating range',
    should: 'returns only places within the rating range',
    run: cases.filterByRatingRange,
  },
  {
    when: 'filtering by minimum rating',
    should: 'returns only places above that rating',
    run: cases.filterByMinRating,
  },
  {
    when: 'filtering by rating count range',
    should: 'returns only places within the review count range',
    run: cases.filterByRatingCount,
  },

  // Email filter (subquery)
  {
    when: 'filtering by email',
    should: 'returns places with matching contact email',
    run: cases.filterByEmail,
  },
  {
    when: 'filtering by email domain',
    should: 'returns places with contacts at that domain',
    run: cases.filterByEmailExactDomain,
  },

  // Technologies filter (subquery)
  {
    when: 'filtering by single technology',
    should: 'returns places using that technology',
    run: cases.filterByTechnologies,
  },
  {
    when: 'filtering by multiple technologies',
    should: 'returns places using any of those technologies',
    run: cases.filterByMultipleTechnologies,
  },

  // Combined filters
  {
    when: 'applying multiple filters',
    should: 'returns places matching all criteria',
    run: cases.filterCombined,
  },
  {
    when: 'applying filters with enrichment data',
    should: 'returns places matching enrichment criteria',
    run: cases.filterCombinedWithEnrichment,
  },

  // ==========================================================================
  // ADDITIONAL FILTERS
  // ==========================================================================

  // Locality filters
  {
    when: 'filtering by single locality',
    should: 'return only places from that city',
    run: cases.filterByLocality,
  },
  {
    when: 'filtering by multiple localities',
    should: 'return places from all specified cities',
    run: cases.filterByMultipleLocalities,
  },

  // Text filters
  {
    when: 'filtering by postal code',
    should: 'return places with matching postal code (partial match)',
    run: cases.filterByPostalCode,
  },
  {
    when: 'filtering by street',
    should: 'return places with matching street (partial match)',
    run: cases.filterByStreet,
  },
  {
    when: 'filtering by website',
    should: 'return places with matching website (partial match)',
    run: cases.filterByWebsite,
  },
  {
    when: 'filtering by phone',
    should: 'return places with matching phone (partial match)',
    run: cases.filterByPhone,
  },

  // Type filters
  {
    when: 'filtering by primary type',
    should: 'return only places with that primary type',
    run: cases.filterByPrimaryType,
  },
  {
    when: 'filtering by multiple primary types',
    should: 'return places with any of those primary types',
    run: cases.filterByMultiplePrimaryTypes,
  },
  {
    when: 'filtering by types array',
    should: 'return places containing the specified type',
    run: cases.filterByTypes,
  },
  {
    when: 'filtering by price level',
    should: 'return only places with that price level',
    run: cases.filterByPriceLevel,
  },

  // Global search
  {
    when: 'using global search',
    should: 'return places matching across name, address, or website',
    run: cases.filterByGlobalSearch,
  },

  // Enrichment filters
  {
    when: 'filtering by workforce range',
    should: 'return places with matching company size',
    run: cases.filterByWorkforceRange,
  },
  {
    when: 'filtering by date of creation (from)',
    should: 'return companies created after the specified date',
    run: cases.filterByDateOfCreation,
  },
  {
    when: 'filtering by date of creation (range)',
    should: 'return companies created within the date range',
    run: cases.filterByDateOfCreationRange,
  },

  // Pagination
  {
    when: 'requesting first page',
    should: 'returns correct page with pagination metadata',
    run: cases.pagination,
  },
  {
    when: 'requesting second page',
    should: 'returns correct items with hasNext and hasPrevious',
    run: cases.paginationSecondPage,
  },
  {
    when: 'requesting last page',
    should: 'returns remaining items with hasNextPage false',
    run: cases.paginationLastPage,
  },

  // ==========================================================================
  // SORTING
  // ==========================================================================
  {
    when: 'sorting by rating descending',
    should: 'returns places ordered by rating high to low',
    run: cases.sortByRating,
  },
  {
    when: 'sorting by rating ascending',
    should: 'returns places ordered by rating low to high',
    run: cases.sortByRatingAsc,
  },
  {
    when: 'sorting by name ascending',
    should: 'returns places ordered alphabetically',
    run: cases.sortByName,
  },
  {
    when: 'sorting by rating count descending',
    should: 'returns places ordered by number of reviews',
    run: cases.sortByRatingCount,
  },
  {
    when: 'sorting by status',
    should: 'reverse order between ASC and DESC',
    run: cases.sortByStatusAscAndDesc,
  },
  {
    when: 'sorting by country ascending',
    should: 'returns places ordered by country alphabetically',
    run: cases.sortByCountry,
  },
  {
    when: 'sorting by locality ascending',
    should: 'returns places ordered by city alphabetically',
    run: cases.sortByLocality,
  },
  {
    when: 'sorting by primary type ascending',
    should: 'returns places ordered by business type alphabetically',
    run: cases.sortByPrimaryType,
  },
  {
    when: 'sorting by invalid column',
    should: 'falls back to default sort and returns results',
    run: cases.sortByInvalidColumnFallsBackToDefault,
  },

  // ==========================================================================
  // DEFAULT SORTING (Enrichment Score)
  // ==========================================================================
  {
    when: 'querying search view without explicit sort',
    should: 'sort by search_place.created_at DESC (enrichment score order)',
    run: cases.searchViewSortsBySearchPlaceCreatedAtByDefault,
  },
  {
    when: 'querying search view with enriched places',
    should: 'preserve enrichment score order via search_place.created_at',
    run: cases.searchViewPreservesEnrichmentScoreOrder,
  },
  {
    when: 'querying all places view without explicit sort',
    should: 'sort by user_place.created_at DESC',
    run: cases.allPlacesViewSortsByUserPlaceCreatedAtByDefault,
  },
  {
    when: 'querying search view with explicit sortBy=createdAt and sortOrder=desc',
    should: 'still use search_place.created_at DESC (enrichment score order)',
    run: cases.searchViewWithExplicitCreatedAtDescStillUsesSearchPlaceCreatedAt,
  },
  {
    when: 'querying search view with sortBy=createdAt and sortOrder=asc',
    should: 'use search_place.created_at ASC (reverse enrichment score order)',
    run: cases.searchViewWithCreatedAtAscUsesSearchPlaceCreatedAt,
  },
  {
    when: 'querying places',
    should: 'return createdAt field in response',
    run: cases.createdAtFieldIsReturnedInResponse,
  },

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  {
    when: 'filtering with no matches',
    should: 'return empty items array with total 0',
    run: cases.emptyResultsReturnsEmptyArray,
  },
  {
    when: 'user has no places',
    should: 'return empty response',
    run: cases.noPlacesForUserReturnsEmpty,
  },
  {
    when: 'querying an empty list',
    should: 'return empty items array',
    run: cases.emptyListReturnsEmpty,
  },
  {
    when: 'requesting page beyond total pages',
    should: 'return empty items with correct total',
    run: cases.paginationBeyondTotalPagesReturnsEmpty,
  },
  {
    when: 'filtering by max rating only',
    should: 'return places with rating at or below max',
    run: cases.maxRatingOnlyFilter,
  },
  {
    when: 'filtering rating on places with null rating',
    should: 'exclude places without rating from min filter',
    run: cases.nullRatingHandledCorrectly,
  },
  {
    when: 'applying conflicting filters',
    should: 'return empty when no intersection exists',
    run: cases.filtersWithNoMatchesReturnsEmpty,
  },
  {
    when: 'not specifying page size',
    should: 'apply default page size',
    run: cases.defaultPageSizeApplied,
  },
  {
    when: 'combining filters with pagination',
    should: 'paginate filtered results correctly',
    run: cases.combinedFiltersAndPagination,
  },
  {
    when: 'searching with special characters',
    should: 'handle apostrophes and accents correctly',
    run: cases.specialCharactersInTextFilters,
  },
  {
    when: 'requesting middle page',
    should: 'return accurate pagination metadata',
    run: cases.paginationMetadataAccuracy,
  },
)
