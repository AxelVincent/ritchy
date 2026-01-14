import { z } from 'zod'

// Contact types
export const ContactTypeEnum = z.enum(['physical', 'legal'])
export type ContactType = z.infer<typeof ContactTypeEnum>

export const GenderEnum = z.enum(['male', 'female', 'other'])
export type Gender = z.infer<typeof GenderEnum>

// Email types
export const EmailQualityEnum = z.enum(['good', 'risky', 'bad', 'unknown'])
export type EmailQuality = z.infer<typeof EmailQualityEnum>

export const EmailResultEnum = z.enum([
  'ok',
  'catch_all',
  'unknown',
  'error',
  'disposable',
  'invalid',
])
export type EmailResult = z.infer<typeof EmailResultEnum>

// Phone types
export const PhoneTypeEnum = z.enum([
  'MOBILE',
  'FIXED_LINE',
  'FIXED_LINE_OR_MOBILE',
  'PREMIUM_RATE',
  'TOLL_FREE',
  'SHARED_COST',
  'VOIP',
  'PERSONAL_NUMBER',
  'PAGER',
  'UAN',
  'VOICEMAIL',
])
export type PhoneType = z.infer<typeof PhoneTypeEnum>

// Plan types
export const PlanEnum = z.enum([
  'FREE',
  'STARTER',
  'GROWTH',
  'ESSENTIALS',
  'PRO',
  'ENTERPRISE',
])
export type Plan = z.infer<typeof PlanEnum>

// Search model types
export const SearchModelEnum = z.enum([
  'BASIC',
  'ENHANCED',
  'ADVANCED',
  'EXPERT',
])
export type SearchModel = z.infer<typeof SearchModelEnum>

// Price level types
export const PriceLevelEnum = z.enum([
  'PRICE_LEVEL_FREE',
  'PRICE_LEVEL_INEXPENSIVE',
  'PRICE_LEVEL_MODERATE',
  'PRICE_LEVEL_EXPENSIVE',
  'PRICE_LEVEL_VERY_EXPENSIVE',
])
export type PriceLevel = z.infer<typeof PriceLevelEnum>

// Social media types
export const SocialMediaPlatformEnum = z.enum([
  'LINKEDIN',
  'FACEBOOK',
  'INSTAGRAM',
])
export type SocialMediaPlatform = z.infer<typeof SocialMediaPlatformEnum>

// Enriched status
export const EnrichedStatusEnum = z.enum([
  'RECENTLY_ENRICHED',
  'ENRICHED',
  'ENRICHMENT_ERROR',
])
export type EnrichedStatus = z.infer<typeof EnrichedStatusEnum>

// Status enum (for places)
export const StatusEnum = z.enum([
  'NEW',
  'NO_ANSWER',
  'CONTACTED',
  'FOLLOW_UP',
  'MEETING',
  'INTERESTED',
  'WON',
  'LOST',
])
export type StatusType = z.infer<typeof StatusEnum>
