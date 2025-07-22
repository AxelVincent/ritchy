import { sql } from 'drizzle-orm'
import { timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core'
import { pgTable, uuid, integer, jsonb, text } from 'drizzle-orm/pg-core'
import { user } from './user'

export type VersionOperation = 'INSERT' | 'UPDATE' | 'DELETE' | 'ROLLBACK'

export type VersionMetadata = {
  // Request context
  ipAddress?: string
  userAgent?: string
  requestId?: string
  // Operation context
  reason?: string
  changedFields?: string[]
  deletedAt?: Date
  // Bulk operation context
  bulkOperationId?: string
  bulkOperationType?: 'INSERT' | 'UPDATE' | 'DELETE'
  affectedRecords?: string[]
  // Rollback context
  rollbackFromVersion?: number
}

// Then define the table
export const versionHistory = pgTable(
  'version_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tableName: text('table_name').notNull(),
    recordId: uuid('record_id').notNull(),
    version: integer('version').notNull(),
    currentState: jsonb('current_state').notNull(),
    previousState: jsonb('previous_state'),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
    operation: text('operation').notNull().$type<VersionOperation>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    metadata: jsonb('metadata').$type<VersionMetadata>()
  },
  (table) => ({
    // Existing indexes
    uniqRecordVersion: uniqueIndex('uniq_record_version').on(
      table.tableName,
      table.recordId,
      table.version
    ),
    tableRecordIdx: index('idx_version_history_table_record').on(
      table.tableName,
      table.recordId
    ),
    userIdIdx: index('idx_version_history_user_id').on(table.userId),
    createdAtIdx: index('idx_version_history_created_at').on(table.createdAt),
    versionCheck: check('version_positive', sql`${table.version} > 0`),
    operationCheck: check(
      'valid_operation',
      sql`${table.operation} IN ('INSERT', 'UPDATE', 'DELETE', 'ROLLBACK')`
    )
  })
)
