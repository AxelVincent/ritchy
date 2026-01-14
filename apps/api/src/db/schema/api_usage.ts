import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { apiKey } from './api_key'

export const apiUsage = pgTable(
  'api_usage',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    apiKeyId: uuid('api_key_id')
      .notNull()
      .references(() => apiKey.id, { onDelete: 'cascade' }),

    // Request details
    endpoint: text('endpoint').notNull(), // e.g., '/v1/enrich/company'
    method: text('method').notNull(), // 'POST'
    statusCode: integer('status_code').notNull(),

    // Resource usage
    creditsUsed: integer('credits_used').notNull().default(0),

    // Performance
    latencyMs: integer('latency_ms'),

    // Request context
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),

    // Request/Response data for replay
    requestBody: jsonb('request_body'),
    responseBody: jsonb('response_body'),

    // Timestamp
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_api_usage_api_key_id').on(table.apiKeyId),
    index('idx_api_usage_created_at').on(table.createdAt),
    index('idx_api_usage_api_key_created').on(table.apiKeyId, table.createdAt),
  ],
)

export type ApiUsage = typeof apiUsage.$inferSelect
export type NewApiUsage = typeof apiUsage.$inferInsert
