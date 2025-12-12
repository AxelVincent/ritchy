import { type FilterableProperty, PLACE_STATUSES } from '@ritchy/types'

// Status options (derived from shared constants)
export const STATUS_OPTIONS = PLACE_STATUSES.map((status) => ({
  value: status,
  label: status.charAt(0) + status.slice(1).toLowerCase(),
}))

// Workforce range options (static)
export const WORKFORCE_RANGE_OPTIONS = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1000 employees' },
  { value: '1001-5000', label: '1001-5000 employees' },
  { value: '5001+', label: '5000+ employees' },
] as const

// All filterable properties configuration
export const FILTERABLE_PROPERTIES: FilterableProperty[] = [
  // Lists filter - allows filtering across multiple lists
  {
    id: 'listIds',
    label: 'Lists',
    type: 'multi_select',
    icon: 'folder',
    dynamicOptions: true, // Options loaded from API
  },

  // Core properties
  {
    id: 'name',
    label: 'Name',
    type: 'text',
    icon: 'building',
  },
  {
    id: 'status',
    label: 'Status',
    type: 'multi_select',
    icon: 'flag',
    dynamicOptions: true, // Options come from API (actual statuses in DB)
  },
  {
    id: 'primaryType',
    label: 'Primary Type',
    type: 'multi_select',
    icon: 'tag',
    dynamicOptions: true,
  },
  {
    id: 'types',
    label: 'Types',
    type: 'multi_select',
    icon: 'tags',
    dynamicOptions: true,
  },
  {
    id: 'rating',
    label: 'Rating',
    type: 'number',
    icon: 'star',
  },
  {
    id: 'ratingCount',
    label: 'Rating Count',
    type: 'number',
    icon: 'hash',
  },

  // Location filters
  {
    id: 'country',
    label: 'Country',
    type: 'multi_select',
    icon: 'globe',
    dynamicOptions: true,
  },
  {
    id: 'locality',
    label: 'City',
    type: 'multi_select',
    icon: 'map-pin',
    dynamicOptions: true,
  },
  {
    id: 'postalCode',
    label: 'Postal Code',
    type: 'text',
    icon: 'mail',
  },
  {
    id: 'street',
    label: 'Street',
    type: 'text',
    icon: 'road',
  },

  // Contact filters
  {
    id: 'website',
    label: 'Website',
    type: 'text',
    icon: 'link',
  },
  {
    id: 'phone',
    label: 'Phone',
    type: 'text',
    icon: 'phone',
  },

  // Source filter
  {
    id: 'source',
    label: 'Source',
    type: 'multi_select',
    icon: 'database',
    dynamicOptions: true,
  },

  // Enrichment data
  {
    id: 'workforceRange',
    label: 'Company Size',
    type: 'multi_select',
    icon: 'users',
    options: [...WORKFORCE_RANGE_OPTIONS],
  },
  {
    id: 'priceLevel',
    label: 'Price Level',
    type: 'multi_select',
    icon: 'dollar-sign',
    dynamicOptions: true,
  },

  // Social media filters
  {
    id: 'facebookUrl',
    label: 'Facebook',
    type: 'text',
    icon: 'facebook',
  },
  {
    id: 'instagramUrl',
    label: 'Instagram',
    type: 'text',
    icon: 'instagram',
  },
  {
    id: 'linkedinUrl',
    label: 'LinkedIn',
    type: 'text',
    icon: 'linkedin',
  },

  // Technologies filter
  {
    id: 'technologies',
    label: 'Technologies',
    type: 'multi_select',
    icon: 'cpu',
    dynamicOptions: true,
  },

  // Date filters
  {
    id: 'lastInteractionAt',
    label: 'Last Interaction',
    type: 'date',
    icon: 'clock',
  },
  {
    id: 'dateOfCreation',
    label: 'Company Created',
    type: 'date',
    icon: 'calendar',
  },
  {
    id: 'domainRegisteredAt',
    label: 'Domain Registered',
    type: 'date',
    icon: 'calendar',
  },

  // Additional text filters
  {
    id: 'email',
    label: 'Email',
    type: 'text',
    icon: 'mail',
  },
  {
    id: 'shortDescription',
    label: 'Description',
    type: 'text',
    icon: 'file-text',
  },
  {
    id: 'sourceUrl',
    label: 'Source URL',
    type: 'text',
    icon: 'external-link',
  },
]

// Note: searchId is NOT a filterable property
// Searches are navigation context, not filter criteria

// Helper to get property configuration by ID
export const getFilterableProperty = (
  propertyId: string,
): FilterableProperty | undefined =>
  FILTERABLE_PROPERTIES.find((p) => p.id === propertyId)

// Get properties by type
export const getPropertiesByType = (
  type: FilterableProperty['type'],
): FilterableProperty[] => FILTERABLE_PROPERTIES.filter((p) => p.type === type)
