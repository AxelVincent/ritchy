import type { Plan, SearchModel } from '@ritchy/types'

export const isModelAvailable = (
  userPlan: Plan | undefined,
  modelType: SearchModel,
): boolean => {
  const plan = userPlan ?? 'FREE'

  switch (plan) {
    case 'FREE':
      return modelType === 'BASIC'
    case 'ESSENTIALS':
      return ['BASIC', 'ESSENTIALS'].includes(modelType)
    case 'PRO':
      return ['BASIC', 'ESSENTIALS'].includes(modelType)
    default:
      return modelType === 'BASIC'
  }

  // Note: ADVANCED and EXPERT models are only available through contact/custom activation
  // They are not available through regular subscription plans
}
