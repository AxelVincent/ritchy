import type { SearchModel, SubscriptionPlan } from '@ritchy/types'

export const isModelAvailable = (
  userPlan: SubscriptionPlan | undefined,
  modelType: SearchModel,
): boolean => {
  const plan = userPlan ?? 'FREE'

  switch (plan) {
    case 'FREE':
      return modelType === 'ESSENTIALS'
    case 'NAVIGATOR':
      return ['ESSENTIALS', 'NAVIGATOR'].includes(modelType)
    case 'EXPLORER':
      return ['ESSENTIALS', 'NAVIGATOR', 'EXPLORER'].includes(modelType)
    case 'PRO':
      return true
    default:
      return modelType === 'ESSENTIALS'
  }
}
