import type { Plan, SearchModel } from '../api/payments/checkout'

// Define search model hierarchy (higher number = more advanced)
const SEARCH_MODEL_HIERARCHY: Record<SearchModel, number> = {
  BASIC: 0,
  ENHANCED: 1,
  ADVANCED: 2,
  EXPERT: 3,
} as const

// Define plan to search model mapping
const PLAN_TO_SEARCH_MODEL: Record<Plan, SearchModel> = {
  FREE: 'BASIC',
  ESSENTIALS: 'ENHANCED',
  PRO: 'ADVANCED',
  ENTERPRISE: 'EXPERT',
} as const

/**
 * Check if a user with a specific search model can access a requested model
 */
export const hasModelAccess = (
  userSearchModel: SearchModel,
  requestedModel: SearchModel,
): boolean => {
  return (
    SEARCH_MODEL_HIERARCHY[userSearchModel] >=
    SEARCH_MODEL_HIERARCHY[requestedModel]
  )
}

/**
 * Get the maximum search model available for a plan
 */
export const getPlanSearchModel = (plan: Plan): SearchModel => {
  return PLAN_TO_SEARCH_MODEL[plan]
}

/**
 * Check if a model is available for a specific plan
 */
export const isModelAvailable = (
  userPlan: Plan | undefined,
  modelType: SearchModel,
): boolean => {
  const plan = userPlan ?? 'FREE'
  const userSearchModel = getPlanSearchModel(plan)
  return hasModelAccess(userSearchModel, modelType)
}
