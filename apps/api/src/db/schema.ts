import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const user = pgTable(
  'user',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clerkId: text('clerk_id').notNull().unique(),
    email: text('email').notNull().unique(),
    userIdNew: uuid('user_id_new'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqClerkId: uniqueIndex('uniq_clerk_id').on(table.clerkId),
    uniqEmail: uniqueIndex('uniq_email').on(table.email),
  }),
)

export const list = pgTable('list', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  userIdNew: uuid('user_id_new'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const listPlace = pgTable(
  'list_place',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listId: uuid('list_id')
      .notNull()
      .references(() => list.id),
    placeId: text('place_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqListPlace: uniqueIndex('uniq_list_place').on(
      table.listId,
      table.placeId,
    ),
  }),
)

export const note = pgTable('note', {
  id: uuid('id').defaultRandom().primaryKey(),
  placeId: text('place_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  userIdNew: uuid('user_id_new'),
  note: text('note').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const searchModelEnum = pgEnum('search_model', [
  'DEFAULT',
  'NAVIGATOR',
  'EXPLORER',
  'PRO',
])

export const search = pgTable('search', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  userIdNew: uuid('user_id_new'),
  latitude: numeric('latitude').notNull(),
  longitude: numeric('longitude').notNull(),
  radiusInMeters: integer('radius_in_meters').notNull(),
  placeName: text('place_name').notNull(),
  keyword: text('keyword').notNull(),
  model: searchModelEnum('model').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const webhookServiceEnum = pgEnum('webhook_service', ['clerk', 'stripe'])

export const webhookEvent = pgTable(
  'webhook_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    type: text('type').notNull(),
    service: webhookServiceEnum('service').notNull(),
    payload: jsonb('payload').notNull(),
    processedAt: timestamp('processed_at').notNull().defaultNow(),
    status: text('status')
      .notNull()
      .default('processed')
      .$type<'processed' | 'failed'>(),
    error: text('error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqIdempotencyKey: uniqueIndex('uniq_idempotency_key').on(
      table.idempotencyKey,
    ),
  }),
)

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

export const subscriptionPlanEnum = pgEnum('subscription_plan', [
  'FREE',
  'EXPLORER',
  'NAVIGATOR',
  'PRO',
])

export const subscription = pgTable(
  'subscription',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id)
      .unique(),
    stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
    stripePriceId: text('stripe_price_id').notNull(),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    status: subscriptionStatusEnum('status').notNull().default('incomplete'),
    plan: subscriptionPlanEnum('plan').notNull().default('FREE'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqStripeSubId: uniqueIndex('uniq_stripe_subscription_id').on(
      table.stripeSubscriptionId,
    ),
    uniqStripeCustomerId: uniqueIndex('uniq_stripe_customer_id').on(
      table.stripeCustomerId,
    ),
    uniqUserId: uniqueIndex('uniq_user_id').on(table.userId),
  }),
)
