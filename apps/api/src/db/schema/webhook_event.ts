import { timestamp, uniqueIndex, text, unique } from 'drizzle-orm/pg-core'
import { pgTable, uuid, jsonb } from 'drizzle-orm/pg-core'
import { webhookServiceEnum } from './enum'

export const webhookEvent = pgTable('webhook_event', {
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
  createdAt: timestamp('created_at').notNull().defaultNow()
})
