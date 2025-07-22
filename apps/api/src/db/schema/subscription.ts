import { timestamp, uniqueIndex, text, unique } from 'drizzle-orm/pg-core'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import {
  subscriptionStatusEnum,
  subscriptionPlanEnum,
  searchModelEnum
} from './enum'
import { user } from './user'

export const subscription = pgTable('subscription', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
    .unique(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  stripePriceId: text('stripe_price_id').notNull(),
  stripeCustomerId: text('stripe_customer_id').notNull(),
  status: subscriptionStatusEnum('status').notNull().default('incomplete'),
  plan: subscriptionPlanEnum('plan').notNull().default('FREE'),
  searchModel: searchModelEnum('search_model').notNull().default('BASIC'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
