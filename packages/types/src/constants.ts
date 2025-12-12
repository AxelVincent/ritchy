/**
 * Shared constants used across frontend and backend
 */

// Default status for places without an explicit status
export const DEFAULT_PLACE_STATUS = 'NEW' as const

// Label for places that are not associated with any list
export const NO_LISTS_LABEL = 'No lists' as const

// All available place statuses
export const PLACE_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'NEGOTIATION',
  'WON',
  'LOST',
  'CHURNED',
] as const

export type PlaceStatus = (typeof PLACE_STATUSES)[number]
