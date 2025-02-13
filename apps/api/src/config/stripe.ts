import { z } from 'zod'

const envSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLIC_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRO_PRICE_ID: z.string().min(1),
  STRIPE_EXPLORER_PRICE_ID: z.string().min(1),
  STRIPE_NAVIGATOR_PRICE_ID: z.string().min(1),
  STRIPE_PRO_PRODUCT_ID: z.string().min(1),
  STRIPE_EXPLORER_PRODUCT_ID: z.string().min(1),
  STRIPE_NAVIGATOR_PRODUCT_ID: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const STRIPE_CONFIG = {
  API_KEYS: {
    SECRET_KEY: env.STRIPE_SECRET_KEY,
    PUBLIC_KEY: env.STRIPE_PUBLIC_KEY,
    WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
  },
  PRICE_IDS: {
    PRO: env.STRIPE_PRO_PRICE_ID,
    EXPLORER: env.STRIPE_EXPLORER_PRICE_ID,
    NAVIGATOR: env.STRIPE_NAVIGATOR_PRICE_ID,
  },
} as const

export const STRIPE_PLANS = {
  FREE: {
    name: 'FREE',
    priceId: null, // Free plan has no price ID
    productId: null,
  },
  EXPLORER: {
    name: 'EXPLORER',
    priceId: env.STRIPE_EXPLORER_PRICE_ID,
    productId: env.STRIPE_EXPLORER_PRODUCT_ID,
  },
  NAVIGATOR: {
    name: 'NAVIGATOR',
    priceId: env.STRIPE_NAVIGATOR_PRICE_ID,
    productId: env.STRIPE_NAVIGATOR_PRODUCT_ID,
  },
  PRO: {
    name: 'PRO',
    priceId: env.STRIPE_PRO_PRICE_ID,
    productId: env.STRIPE_PRO_PRODUCT_ID,
  },
} as const

export type StripePlan = keyof typeof STRIPE_PLANS

// Helper to get plan from Stripe price ID
export const getPlanFromPriceId = (priceId: string): StripePlan => {
  const plan = Object.entries(STRIPE_PLANS).find(
    ([_, planData]) => planData.priceId === priceId,
  )
  if (!plan) {
    console.warn(`No Stripe plan found for price ID: ${priceId}, defaulting to FREE plan`)
  }
  return (plan?.[0] as StripePlan) ?? 'FREE'
}
