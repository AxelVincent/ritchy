export type PlanType = 'ESSENTIALS' | 'NAVIGATOR' | 'EXPLORER' | 'PRO'

const modelHierarchy: Record<PlanType, number> = {
  ESSENTIALS: 0,
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
