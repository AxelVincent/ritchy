import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './user'

export const apiKey = pgTable(
  'api_key',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Key storage
    keyHash: text('key_hash').notNull().unique(), // SHA-256 hash for validation
    encryptedKey: text('encrypted_key').notNull(), // AES-256 encrypted full key for retrieval

    // Metadata
    name: text('name').notNull(), // User-defined label

    // Status
    isActive: boolean('is_active').notNull().default(true),
    lastUsedAt: timestamp('last_used_at'),

    // Audit
    createdAt: timestamp('created_at').notNull().defaultNow(),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => [
    index('idx_api_key_user_id').on(table.userId),
    index('idx_api_key_key_hash').on(table.keyHash),
    index('idx_api_key_is_active').on(table.isActive),
  ],
)

export type ApiKey = typeof apiKey.$inferSelect
export type NewApiKey = typeof apiKey.$inferInsert
