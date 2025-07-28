import {
  CompanyFieldEnum,
  ContactFieldEnum,
  PhoneTypeEnum,
  PlanEnum,
  SearchModelEnum,
  SocialMediaPlatformEnum,
  StatusFieldEnum,
} from '@ritchy/types'
import { pgEnum } from 'drizzle-orm/pg-core'

export const socialPlatformEnum = pgEnum(
  'social_platform',
  SocialMediaPlatformEnum.options,
)

export const phoneTypeEnum = pgEnum('phone_type', PhoneTypeEnum.options)

export const placeSourceEnum = pgEnum('place_source', ['google'])

export const searchModelEnum = pgEnum('search_model', SearchModelEnum.options)

export const webhookServiceEnum = pgEnum('webhook_service', [
  'clerk',
  'stripe',
  'hubspot',
])

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'incomplete', // Payment failed during subscription creation
  'incomplete_expired', // Initial payment failed and subscription expired
  'trialing', // Currently in trial period
  'active', // Subscription is active and paid
  'past_due', // Payment failed for an active subscription
  'canceled', // Subscription has been canceled
  'unpaid', // Payment failed and subscription entered dunning
  'paused', // Subscription is paused (if pause feature enabled)
])

export const subscriptionPlanEnum = pgEnum(
  'subscription_plan',
  PlanEnum.options,
)

export const leadStatusEnum = pgEnum('lead_status', [
  'NEW',
  'NO_ANSWER',
  'CONTACTED',
  'FOLLOW_UP',
  'MEETING',
  'INTERESTED',
  'WON',
  'LOST',
])

// Update the enum to include status fields
export const internalFieldEnum = pgEnum('internal_field', [
  ...CompanyFieldEnum.options,
  ...ContactFieldEnum.options,
  ...StatusFieldEnum.options,
])
