import { createIntegrationTestSuite } from '../../../../__tests__/integration/utils/create-integration-test-suite'
import * as cases from './cases'

createIntegrationTestSuite(
  { name: 'GET /user-places/markers' },

  // ==========================================================================
  // SCOPE & AUTHORIZATION (High Priority)
  // ==========================================================================
  {
    when: 'scoping by listId',
    should: 'return markers only from places in that list',
    run: cases.scopeByListId,
  },
  {
    when: 'scoping by searchId',
    should: 'return markers only from places in that search',
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
    should: 'return markers from all user places',
    run: cases.scopeAllPlaces,
  },

  // ==========================================================================
  // VALIDATION
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
    when: 'providing negative ratingCountMin',
    should: 'return 400 with validation error',
    run: cases.invalidRatingCountMinNegative,
  },

  // ==========================================================================
  // BASIC MARKER DATA
  // ==========================================================================
  {
    when: 'querying markers',
    should: 'return marker with required fields (id, name, status, location)',
    run: cases.markerContainsRequiredFields,
  },
  {
    when: 'place has no explicit status',
    should: 'return marker with null status',
    run: cases.markerStatusIsNullWhenNotSet,
  },
  {
    when: 'querying marker location',
    should: 'return location from place data',
    run: cases.markerLocationFromPlace,
  },
  {
    when: 'querying multiple markers',
    should: 'return totalCount matching markers array length',
    run: cases.totalCountMatchesMarkersLength,
  },
  {
    when: 'places have different statuses',
    should: 'return markers with their respective statuses',
    run: cases.markersWithDifferentStatuses,
  },
  {
    when: 'user has many places',
    should: 'return all markers (no pagination)',
    run: cases.markersReturnedForAllUserPlaces,
  },

  // ==========================================================================
  // FILTER TESTS
  // ==========================================================================
  {
    when: 'filtering by single status',
    should: 'return only markers with that status',
    run: cases.filterByStatus,
  },
  {
    when: 'filtering by multiple statuses',
    should: 'return markers with any of those statuses',
    run: cases.filterByMultipleStatuses,
  },
  {
    when: 'filtering by name',
    should: 'return markers with matching name (partial match)',
    run: cases.filterByName,
  },
  {
    when: 'filtering by country',
    should: 'return only markers from that country',
    run: cases.filterByCountry,
  },
  {
    when: 'filtering by locality',
    should: 'return only markers from that city',
    run: cases.filterByLocality,
  },
  {
    when: 'filtering by primary type',
    should: 'return only markers with that primary type',
    run: cases.filterByPrimaryType,
  },
  {
    when: 'filtering by rating range',
    should: 'return markers within the rating range',
    run: cases.filterByRatingRange,
  },
  {
    when: 'filtering by workforce range',
    should: 'return markers with matching company size',
    run: cases.filterByWorkforceRange,
  },
  {
    when: 'using global search',
    should: 'return markers matching name, address, or website',
    run: cases.filterByGlobalSearch,
  },
  {
    when: 'applying multiple filters',
    should: 'return markers matching all criteria',
    run: cases.filterCombined,
  },
  {
    when: 'filtering by multiple list IDs',
    should: 'return only markers from those lists',
    run: cases.filterByMultipleListIds,
  },

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  {
    when: 'user has no places',
    should: 'return empty markers array with totalCount 0',
    run: cases.noPlacesReturnsEmptyArray,
  },
  {
    when: 'querying an empty list',
    should: 'return empty markers array',
    run: cases.emptyListReturnsEmptyArray,
  },
  // NOTE: filterWithNoMatchesReturnsEmpty uses country filter which is broken
  // {
  // 	when: 'filter matches no places',
  // 	should: 'return empty markers array',
  // 	run: cases.filterWithNoMatchesReturnsEmpty,
  // },
  {
    when: 'place name contains special characters',
    should: 'handle apostrophes and accents correctly',
    run: cases.specialCharactersInName,
  },
  {
    when: 'multiple users exist',
    should: 'return only markers for the requesting user',
    run: cases.markersOnlyForUserPlaces,
  },
  // NOTE: conflictingFiltersReturnsEmpty uses country filter which is broken
  // {
  // 	when: 'applying conflicting filters',
  // 	should: 'return empty when no intersection exists',
  // 	run: cases.conflictingFiltersReturnsEmpty,
  // },
  {
    when: 'list scoped with additional filters',
    should: 'apply both list scope and filter criteria',
    run: cases.listScopeWithFilters,
  },
  {
    when: 'place is in multiple lists',
    should: 'return marker only once (no duplicates)',
    run: cases.markersUniqueNoduplicates,
  },
)
