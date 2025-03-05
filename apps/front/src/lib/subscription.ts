import type { SubscriptionPlan } from '@ritchy/types'

export type ModelType = 'DEFAULT' | 'NAVIGATOR' | 'EXPLORER' | 'PRO'

export const isModelAvailable = (
  userPlan: SubscriptionPlan | undefined,
  modelType: ModelType,
): boolean => {
  const plan = userPlan ?? 'FREE'

  switch (plan) {
    case 'FREE':
      return modelType === 'DEFAULT'
    case 'NAVIGATOR':
      return ['DEFAULT', 'NAVIGATOR'].includes(modelType)
    case 'EXPLORER':
      return ['DEFAULT', 'NAVIGATOR', 'EXPLORER'].includes(modelType)
    case 'PRO':
      return true
    default:
      return modelType === 'DEFAULT'
  }
}
