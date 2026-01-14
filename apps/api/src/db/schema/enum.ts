import { pgEnum } from 'drizzle-orm/pg-core'
import {
  ContactTypeEnum,
  EmailQualityEnum,
  EmailResultEnum,
  PhoneTypeEnum,
  PlanEnum,
  PriceLevelEnum,
  SearchModelEnum,
  SocialMediaPlatformEnum,
} from '../../shared'

export const socialPlatformEnum = pgEnum(
  'social_platform',
  SocialMediaPlatformEnum.options,
)

export const priceLevelEnum = pgEnum('price_level', PriceLevelEnum.options)

export const phoneTypeEnum = pgEnum('phone_type', PhoneTypeEnum.options)

export const placeSourceEnum = pgEnum('place_source', ['google'])

export const searchModelEnum = pgEnum('search_model', SearchModelEnum.options)

export const webhookServiceEnum = pgEnum('webhook_service', ['clerk', 'stripe'])

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

export const emailQualityEnum = pgEnum('email_quality', [
  ...EmailQualityEnum.options,
])

export const emailResultEnum = pgEnum('email_result', [
  ...EmailResultEnum.options,
])

export const contactTypeEnum = pgEnum('contact_type', [
  ...ContactTypeEnum.options,
])

export const enrichmentPhaseStatusEnum = pgEnum('enrichment_phase_status', [
  'idle',
  'queued',
  'processing',
  'completed',
  'failed',
])

export const businessStatusEnum = pgEnum('business_status', [
  'OPERATIONAL',
  'CLOSED_TEMPORARILY',
  'CLOSED_PERMANENTLY',
])
