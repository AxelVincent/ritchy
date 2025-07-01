import type { SearchModel } from '@ritchy/types'

// Define search model hierarchy (higher number = more advanced)
const SEARCH_MODEL_HIERARCHY: Record<SearchModel, number> = {
  BASIC: 0,
  ENHANCED: 1,
  ADVANCED: 2,
  EXPERT: 3,
} as const

export const hasModelAccess = (
  userSearchModel: SearchModel,
  requestedModel: SearchModel,
): boolean => {
  return (
    SEARCH_MODEL_HIERARCHY[userSearchModel] >=
    SEARCH_MODEL_HIERARCHY[requestedModel]
  )
}
