import { createIntegrationTestSuite } from '../../../../__tests__/integration/utils/create-integration-test-suite'
import * as cases from './cases'

createIntegrationTestSuite(
  { name: 'GET /user-places/filter-options' },

  // ==========================================================================
  // SCOPE & AUTHORIZATION (High Priority)
  // ==========================================================================
  {
    when: 'scoping by listId',
    should: 'return filter options only from places in that list',
    run: cases.scopeByListId,
  },
  {
    when: 'scoping by searchId',
    should: 'return filter options only from places in that search',
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
    should: 'return filter options from all user places',
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

  // ==========================================================================
  // BASIC FILTER OPTIONS
  // ==========================================================================
  {
    when: 'user has places with different statuses',
    should: 'return all unique statuses',
    run: cases.statusOptionsUnique,
  },
  {
    when: 'user has places with no explicit status',
    should: 'include NEW in status options',
    run: cases.statusDefaultIncluded,
  },
  {
    when: 'user has places with different primary types',
    should: 'return all unique primary types',
    run: cases.primaryTypeOptionsUnique,
  },
  {
    when: 'user has places with different types arrays',
    should: 'return all unique types (flattened)',
    run: cases.typesOptionsFlattened,
  },
  {
    when: 'user has places in different countries',
    should: 'return all unique countries',
    run: cases.countryOptionsUnique,
  },
  {
    when: 'user has places in different localities',
    should: 'return all unique localities',
    run: cases.localityOptionsUnique,
  },
  {
    when: 'user has places with different postal codes',
    should: 'return all unique postal codes',
    run: cases.postalCodeOptionsUnique,
  },
  {
    when: 'user has places from different sources',
    should: 'return all unique sources',
    run: cases.sourceOptionsUnique,
  },
  {
    when: 'user has places with different price levels',
    should: 'return all unique price levels',
    run: cases.priceLevelOptionsUnique,
  },

  // ==========================================================================
  // LIST ASSOCIATION OPTIONS
  // ==========================================================================
  {
    when: 'user has places in multiple lists',
    should: 'return all list names with emoji',
    run: cases.listsOptionsWithNames,
  },
  {
    when: 'user has places not in any list',
    should: 'include No lists option',
    run: cases.listsOptionsIncludesNoLists,
  },
  {
    when: 'querying list-scoped view',
    should: 'return only lists that places in THAT list are also in',
    run: cases.listScopedReturnsAssociatedLists,
  },

  // ==========================================================================
  // ENRICHMENT-BASED OPTIONS
  // ==========================================================================
  {
    when: 'user has enriched places with workforce data',
    should: 'return all unique workforce ranges',
    run: cases.workforceRangeOptionsUnique,
  },
  {
    when: 'user has enriched places with technologies',
    should: 'return all unique technologies',
    run: cases.technologiesOptionsUnique,
  },
  {
    when: 'user has no enriched places',
    should: 'return empty arrays for enrichment fields',
    run: cases.noEnrichmentReturnsEmptyArrays,
  },

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  {
    when: 'user has no places',
    should: 'return empty arrays with defaults (NEW, No lists)',
    run: cases.noPlacesReturnsDefaults,
  },
  {
    when: 'all places have null/empty values for a field',
    should: 'return empty array for that field',
    run: cases.nullValuesFilteredOut,
  },
  {
    when: 'options contain special characters',
    should: 'handle apostrophes and accents correctly',
    run: cases.specialCharactersHandled,
  },
  {
    when: 'list scoped to empty list',
    should: 'return empty arrays with defaults',
    run: cases.emptyListScopedReturnsDefaults,
  },
  {
    when: 'querying filter options',
    should: 'return options sorted alphabetically',
    run: cases.optionsSortedAlphabetically,
  },
  {
    when: 'querying lists options',
    should: 'return No lists first then sorted alphabetically',
    run: cases.listsOptionsSortedWithNoListsFirst,
  },
)
