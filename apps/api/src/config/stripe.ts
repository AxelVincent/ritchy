import { logger } from '@ritchy/logger'
import { z } from 'zod'

const envSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLIC_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRO_PRODUCT_ID: z.string().min(1),
  STRIPE_ESSENTIALS_PRODUCT_ID: z.string().min(1),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().min(1),
  STRIPE_ESSENTIALS_MONTHLY_PRICE_ID: z.string().min(1),
  STRIPE_ESSENTIALS_QUARTERLY_PRICE_ID: z.string().min(1),
  STRIPE_PRO_QUARTERLY_PRICE_ID: z.string().min(1),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().min(1),
  STRIPE_ESSENTIALS_YEARLY_PRICE_ID: z.string().min(1),
})

const env = envSchema.parse(process.env)

export const STRIPE_CONFIG = {
  API_KEYS: {
    SECRET_KEY: env.STRIPE_SECRET_KEY,
    PUBLIC_KEY: env.STRIPE_PUBLIC_KEY,
    WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
  },
  PRICE: {
    MONTHLY: {
      PRO: env.STRIPE_PRO_MONTHLY_PRICE_ID,
      ESSENTIALS: env.STRIPE_ESSENTIALS_MONTHLY_PRICE_ID,
    },
    QUARTERLY: {
      PRO: env.STRIPE_PRO_QUARTERLY_PRICE_ID,
      ESSENTIALS: env.STRIPE_ESSENTIALS_QUARTERLY_PRICE_ID,
    },
    YEARLY: {
      PRO: env.STRIPE_PRO_YEARLY_PRICE_ID,
      ESSENTIALS: env.STRIPE_ESSENTIALS_YEARLY_PRICE_ID,
    },
  },
  PRODUCT_IDS: {
    PRO: env.STRIPE_PRO_PRODUCT_ID,
    ESSENTIALS: env.STRIPE_ESSENTIALS_PRODUCT_ID,
  },
} as const

export const STRIPE_PLANS = {
  FREE: {
    name: 'FREE',
    price: null, // Free plan has no price ID
    productId: null,
  },
  ESSENTIALS: {
    name: 'ESSENTIALS',
    price: {
      monthly: env.STRIPE_ESSENTIALS_MONTHLY_PRICE_ID,
      quarterly: env.STRIPE_ESSENTIALS_QUARTERLY_PRICE_ID,
      yearly: env.STRIPE_ESSENTIALS_YEARLY_PRICE_ID,
    },
    productId: env.STRIPE_ESSENTIALS_PRODUCT_ID,
  },
  PRO: {
    name: 'PRO',
    price: {
      monthly: env.STRIPE_PRO_MONTHLY_PRICE_ID,
      quarterly: env.STRIPE_PRO_QUARTERLY_PRICE_ID,
      yearly: env.STRIPE_PRO_YEARLY_PRICE_ID,
    },
    productId: env.STRIPE_PRO_PRODUCT_ID,
  },
} as const

export type StripePlan = keyof typeof STRIPE_PLANS

// Helper to get plan from Stripe price ID
export const getPlanFromProductId = (productId: string): StripePlan => {
  const plan = Object.entries(STRIPE_PLANS).find(
    ([_, planData]) => planData.productId === productId,
  )
  if (!plan) {
    logger.warn({
      msg: `No Stripe plan found for product ID: ${productId}, defaulting to FREE plan`,
      event: 'get_plan_from_product_id',
      metadata: {
        productId,
      },
    })
  }
  return (plan?.[0] as StripePlan) ?? 'FREE'
}
