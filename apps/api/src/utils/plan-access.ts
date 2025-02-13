export type PlanType = 'DEFAULT' | 'NAVIGATOR' | 'EXPLORER' | 'PRO'

const modelHierarchy: Record<PlanType, number> = {
  DEFAULT: 0,
  NAVIGATOR: 1,
  EXPLORER: 2,
  PRO: 3,
} as const

export const hasModelAccess = (
  userPlan: PlanType,
  requestedModel: PlanType,
): boolean => {
  return modelHierarchy[userPlan] >= modelHierarchy[requestedModel]
}
