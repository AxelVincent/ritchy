import {
  index,
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
    firstName: text('first_name'),
    lastName: text('last_name'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqClerkId: uniqueIndex('uniq_clerk_id').on(table.clerkId),
  }),
)

export const list = pgTable('list', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const listPlace = pgTable(
  'list_place',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listId: uuid('list_id')
      .notNull()
      .references(() => list.id, { onDelete: 'cascade' }),
    placeId: text('place_id').notNull(),
    searchId: uuid('search_id').references(() => search.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqListPlace: uniqueIndex('uniq_list_place').on(
      table.listId,
      table.placeId,
    ),
    listIdIdx: index('idx_list_place_list_id').on(table.listId),
  }),
)

export const note = pgTable('note', {
  id: uuid('id').defaultRandom().primaryKey(),
  placeId: text('place_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  note: text('note').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const searchModelEnum = pgEnum('search_model', [
  'ESSENTIALS',
  'NAVIGATOR',
  'EXPLORER',
  'PRO',
])

export const search = pgTable('search', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
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
  'ESSENTIALS',
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
      .references(() => user.id, { onDelete: 'cascade' })
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

export const enrichment = pgTable(
  'enrichment',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    placeId: text('place_id').notNull(),
    website: text('website').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqUserPlace: uniqueIndex('uniq_user_place').on(
      table.userId,
      table.placeId,
    ),
  }),
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

export const status = pgTable(
  'status',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    placeId: text('place_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: leadStatusEnum('status').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqUserPlace: uniqueIndex('uniq_user_place_status').on(
      table.userId,
      table.placeId,
    ),
  }),
)
