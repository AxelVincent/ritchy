/**
 * Versioned Database Client
 *
 * This module provides a versioned database client that automatically tracks all changes
 * to database records in a version history system. Every operation (insert, update, delete)
 * is automatically versioned with complete metadata about the change.
 *
 * Features:
 * - Automatic version tracking for all operations
 * - Transaction support with atomic operations
 * - Bulk operation support with version history
 * - Strict validation using Zod schemas
 * - Complete metadata tracking including user context
 * - Support for UPSERT operations with conflict resolution
 *
 * For detailed documentation about the version history system, including:
 * - Core concepts and architecture
 * - Usage examples and best practices
 * - Querying patterns
 * - Performance considerations
 *
 * See: docs/version-history.md
 *
 * @example
 * ```typescript
 * const versionedDb = createVersionedDb(req)
 * await versionedDb.transaction(async (ops) => {
 *   await ops.update('table', data, { id: recordId })
 * })
 * ```
 */

import type { PgUpdateSetSource } from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { Request } from 'express'
import { db } from '../db'
import type * as schema from '../schema'
import createOperations from './operations'
import type {
  InferInsert,
  InferTable,
  TableName,
  VersionContext,
} from './types'
import { getContextFromRequest } from './utils/helpers'

// Transaction wrapper
const withTransaction = async <T>(
  operation: (db: PostgresJsDatabase<typeof schema>) => Promise<T>,
): Promise<T> => {
  return db.transaction(operation)
}

/**
 * Creates a versioned database client that automatically tracks all changes.
 * Each operation (insert, update, delete) is recorded in the version history
 * with complete metadata about the change.
 *
 * For detailed documentation about the version history system and its operations,
 * see: docs/version-history.md
 *
 * @param context - Version context containing metadata about the operation
 * @returns A versioned database client with methods for tracked operations
 */
export const createVersionedDb = (context: VersionContext) => {
  const operations = createOperations(context)

  return {
    insert: <T extends TableName>(table: T, data: InferInsert<T>) =>
      withTransaction((db) => operations.insert(table, data, db)),

    update: <T extends TableName>(
      table: T,
      data: PgUpdateSetSource<InferTable<T>>,
      where: { id: string },
    ) => withTransaction((db) => operations.update(table, data, where, db)),

    delete: <T extends TableName>(table: T, where: { id: string }) =>
      withTransaction((db) => operations.delete(table, where, db)),

    bulkUpsert: <T extends TableName>(
      table: T,
      data: (InferInsert<T> & { id?: string })[],
      conflictTarget: (keyof InferTable<T>)[],
    ) =>
      withTransaction((db) =>
        operations.bulkUpsert(table, data, conflictTarget, db),
      ),

    bulkDelete: <T extends TableName>(
      table: T,
      data: (Record<string, unknown> & { id?: string })[],
      conflictTarget: (keyof InferTable<T>)[],
    ) =>
      withTransaction((db) =>
        operations.bulkDelete(table, data, conflictTarget, db),
      ),

    upsert: <T extends TableName>(
      table: T,
      data: InferInsert<T>,
      conflictTarget: (keyof InferTable<T>)[],
    ) =>
      withTransaction(async (db) => {
        const {
          records: [record],
        } = await operations.bulkUpsert(table, [data], conflictTarget, db)
        return record
      }),

    transaction: <T>(
      fn: (
        ops: typeof operations & { db: PostgresJsDatabase<typeof schema> },
      ) => Promise<T>,
    ) => withTransaction(async (db) => fn({ ...operations, db })),
  }
}

// Helper function to create versioned DB from request (for HTTP routes)
export const createVersionedDbFromRequest = (req: Request) => {
  const context = getContextFromRequest(req)
  return createVersionedDb(context)
}
