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

import { type InferInsertModel, type Table, and, desc, eq } from 'drizzle-orm'
import type { PgColumn, PgUpdateSetSource } from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { Request } from 'express'
import { z } from 'zod'
import { db } from './db'
import * as schema from './schema'
import { versionHistory } from './schema'
import type { VersionMetadata, VersionOperation } from './schema'

// Types
type TableName = {
  [K in keyof typeof schema]: (typeof schema)[K] extends Table ? K : never
}[keyof typeof schema]

type ChangeSource = 'user' | 'system' | 'integration' | 'bulk'

type BulkDeleteResult = {
  deleted: string[]
  notFound: string[]
}

type BulkUpsertResult<T extends TableName> = {
  records: (typeof schema)[T]['$inferSelect'][]
  operations: { [key: string]: 'insert' | 'update' }
}

interface VersionContext {
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  changeSource?: ChangeSource
  requestId?: string
  additionalContext?: Record<string, unknown>
  bulkOperationId?: string
}

const getContextFromRequest = (req?: Request): VersionContext =>
  req
    ? {
        userId: req.auth?.userId,
        sessionId: req.auth?.sessionId,
        ipAddress: req.metadata?.ipAddress,
        userAgent: req.metadata?.userAgent,
        requestId: req.metadata?.requestId,
        changeSource: 'user',
        bulkOperationId: req.body?.bulkOperationId,
      }
    : { changeSource: 'system' }

type InferTable<T extends TableName> = (typeof schema)[T]
type InferSelect<T extends TableName> = InferTable<T>['$inferSelect']
type InferInsert<T extends TableName> = InferInsertModel<InferTable<T>>

const versionMetadataSchema = z.object({
  // Request context
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),
  // Operation context
  reason: z.string().optional(),
  changedFields: z.array(z.string()).optional(),
  deletedAt: z.date().optional(),
  // Bulk operation context
  bulkOperationId: z.string().uuid().optional(),
  bulkOperationType: z.enum(['INSERT', 'UPDATE', 'DELETE']).optional(),
  affectedRecords: z.array(z.string()).optional(),
  // Rollback context
  rollbackFromVersion: z.number().int().positive().optional(),
})

const versionStateSchema = z
  .object({
    id: z.string().uuid(),
  })
  .passthrough()

const baseOperationSchema = z.object({
  table: z.string(),
  recordId: z.string().uuid(),
})

const versionOperationSchema = z.discriminatedUnion('operation', [
  // INSERT/UPSERT (new record)
  z.object({
    operation: z.literal('INSERT'),
    currentState: versionStateSchema,
    previousState: z.null(),
    metadata: versionMetadataSchema,
    ...baseOperationSchema.shape,
  }),
  // UPDATE/UPSERT (existing record)
  z.object({
    operation: z.literal('UPDATE'),
    currentState: versionStateSchema,
    previousState: versionStateSchema,
    metadata: versionMetadataSchema.extend({
      changedFields: z.array(z.string()),
    }),
    ...baseOperationSchema.shape,
  }),
  // DELETE
  z.object({
    operation: z.literal('DELETE'),
    currentState: versionStateSchema,
    previousState: z.null(),
    metadata: versionMetadataSchema.extend({
      deletedAt: z.date(),
    }),
    ...baseOperationSchema.shape,
  }),
  // ROLLBACK
  z.object({
    operation: z.literal('ROLLBACK'),
    currentState: versionStateSchema,
    previousState: versionStateSchema,
    metadata: versionMetadataSchema.extend({
      rollbackFromVersion: z.number().int().positive(),
    }),
    ...baseOperationSchema.shape,
  }),
  // BULK
  z.object({
    operation: z.literal('BULK'),
    currentState: versionStateSchema,
    previousState: versionStateSchema.nullable(),
    metadata: versionMetadataSchema.extend({
      bulkOperationId: z.string().uuid(),
    }),
    ...baseOperationSchema.shape,
  }),
])

type VersionOperationInput = {
  operation: VersionOperation
  currentState: Record<string, unknown>
  previousState: Record<string, unknown> | null
  metadata: VersionMetadata
  table: string
  recordId: string
}

const validateVersionOperation = (input: VersionOperationInput) => {
  const operation = input.previousState ? 'UPDATE' : 'INSERT'

  return versionOperationSchema.parse({
    ...input,
    operation,
  })
}

const createOperations = (context: VersionContext) => ({
  insert: async <T extends TableName>(
    table: T,
    data: InferInsert<T>,
    db: PostgresJsDatabase<typeof schema>,
  ): Promise<InferSelect<T>> => {
    const result = await db
      .insert(schema[table])
      .values(data as unknown as InferInsertModel<(typeof schema)[T]>)
      .returning()

    if (!result[0]) throw new Error('Insert failed')

    const currentState = result[0]
    const metadata = {
      changedFields: Object.keys(data),
      bulkOperationId: context.bulkOperationId,
    }
    validateVersionOperation({
      operation: 'INSERT',
      currentState,
      previousState: null,
      metadata,
      table,
      recordId: result[0].id,
    })
    await db.insert(versionHistory).values({
      tableName: table,
      recordId: result[0].id,
      version: 1,
      currentState,
      previousState: null,
      userId: context.userId ?? '',
      operation: 'INSERT',
      metadata,
    })

    return result[0] as InferSelect<T>
  },

  update: async <T extends TableName>(
    table: T,
    data: PgUpdateSetSource<InferTable<T>>,
    where: { id: string },
    db: PostgresJsDatabase<typeof schema>,
  ): Promise<InferSelect<T>> => {
    const [currentRecord] = await db
      .select()
      .from(schema[table])
      .where(eq(schema[table].id, where.id))
      .limit(1)

    if (!currentRecord) throw new Error('Record not found')

    const [latest] = await db
      .select({ version: versionHistory.version })
      .from(versionHistory)
      .where(
        and(
          eq(versionHistory.tableName, table),
          eq(versionHistory.recordId, where.id),
        ),
      )
      .orderBy(desc(versionHistory.version))
      .limit(1)

    const result = await db
      .update(schema[table])
      .set(data as unknown as PgUpdateSetSource<(typeof schema)[T]>)
      .where(eq(schema[table].id, where.id))
      .returning()

    if (!result[0]) throw new Error('Update failed')

    // Calculate changed fields by comparing current and previous state
    const changedFields = Object.keys(data).filter((key) => {
      // Skip the id field as it's used for identification
      if (key === 'id') return false
      const prev = (currentRecord as Record<string, unknown>)[key]
      const curr = (result[0] as Record<string, unknown>)[key]
      return JSON.stringify(prev) !== JSON.stringify(curr)
    })

    const currentState = result[0]
    const previousState = currentRecord
    const metadata = {
      changedFields,
      bulkOperationId: context.bulkOperationId,
    }

    validateVersionOperation({
      operation: 'UPDATE',
      currentState,
      previousState,
      metadata,
      table,
      recordId: where.id,
    })
    await db.insert(versionHistory).values({
      tableName: table,
      recordId: where.id,
      version: (latest?.version ?? 0) + 1,
      currentState,
      previousState,
      userId: context.userId ?? '',
      operation: 'UPDATE',
      metadata,
    })

    return result[0] as InferSelect<T>
  },

  delete: async <T extends TableName>(
    table: T,
    where: { id: string },
    db: PostgresJsDatabase<typeof schema>,
  ): Promise<InferSelect<T>> => {
    const [record] = (await db
      .select()
      .from(schema[table])
      .where(eq(schema[table].id, where.id))
      .limit(1)) as [InferSelect<T> | undefined]

    if (!record) throw new Error('Record not found')

    await db.transaction(async (tx) => {
      await tx.delete(schema[table]).where(eq(schema[table].id, where.id))

      const [latest] = await tx
        .select({ version: versionHistory.version })
        .from(versionHistory)
        .where(
          and(
            eq(versionHistory.tableName, table),
            eq(versionHistory.recordId, record.id),
          ),
        )
        .orderBy(desc(versionHistory.version))
        .limit(1)

      const currentState = record
      const metadata = {
        deletedAt: new Date(),
        bulkOperationId: context.bulkOperationId,
      }

      validateVersionOperation({
        operation: 'DELETE',
        currentState,
        previousState: null,
        metadata,
        table,
        recordId: record.id,
      })
      await tx.insert(versionHistory).values({
        tableName: table,
        recordId: record.id,
        version: (latest?.version ?? 0) + 1,
        currentState,
        previousState: null,
        userId: context.userId ?? '',
        operation: 'DELETE',
        metadata,
      })
    })

    return record
  },

  /**
   * Performs bulk delete operations with version history tracking.
   * Each deleted record's final state is preserved in version history.
   *
   * For more details about bulk operations and version history,
   * see: docs/version-history.md#bulk-operations
   */
  bulkUpsert: async <T extends TableName>(
    table: T,
    data: (InferInsert<T> & { id?: string })[],
    conflictTarget: (keyof InferTable<T>)[],
    db: PostgresJsDatabase<typeof schema>,
  ): Promise<BulkUpsertResult<T>> => {
    const bulkOperationId = crypto.randomUUID()

    return db.transaction(async (tx) => {
      const previousStates = await Promise.all(
        data.map(async (originalData) => {
          const [previousState] = await tx
            .select()
            .from(schema[table])
            .where(
              and(
                ...conflictTarget.map((col) =>
                  eq(
                    (schema[table] as { [K in keyof InferTable<T>]: PgColumn })[
                      col
                    ],
                    originalData[col as keyof typeof originalData],
                  ),
                ),
              ),
            )
            .limit(1)
          return { originalData, previousState }
        }),
      )

      const results = await tx
        .insert(schema[table])
        .values(data as unknown as InferInsertModel<(typeof schema)[T]>[])
        .onConflictDoUpdate({
          target: conflictTarget.map(
            (col) =>
              (schema[table] as { [K in keyof InferTable<T>]: PgColumn })[col],
          ),
          set: {
            ...data[0],
            updatedAt: new Date(),
          } as unknown as PgUpdateSetSource<(typeof schema)[T]>,
        })
        .returning()

      // Record version history for each result
      for (const result of results) {
        const { originalData, previousState } = previousStates.find((item) =>
          conflictTarget.every(
            (col) =>
              item.originalData[col as keyof typeof item.originalData] ===
              result[col as keyof typeof result],
          ),
        ) || { originalData: null, previousState: null }

        if (!originalData) continue

        const [latest] = await tx
          .select({ version: versionHistory.version })
          .from(versionHistory)
          .where(
            and(
              eq(versionHistory.tableName, table),
              eq(versionHistory.recordId, result.id),
            ),
          )
          .orderBy(desc(versionHistory.version))
          .limit(1)
          .for('update')

        const currentState = result
        const metadata = {
          changedFields: Object.keys(originalData).filter(
            (key) => !conflictTarget.includes(key as keyof InferTable<T>),
          ),
          bulkOperationId,
        }

        const operation = previousState ? 'UPDATE' : 'INSERT'

        validateVersionOperation({
          operation,
          currentState,
          previousState: previousState || null,
          metadata,
          table,
          recordId: result.id,
        })

        await tx.insert(versionHistory).values({
          tableName: table,
          recordId: result.id,
          version: (latest?.version ?? 0) + 1,
          currentState,
          previousState: previousState || null,
          userId: context.userId ?? '',
          operation,
          metadata,
        })
      }

      return {
        records: results,
        operations: results.reduce(
          (acc, result) => {
            const originalData = data.find((item) => item.id === result.id)
            acc[result.id] = originalData?.id ? 'update' : 'insert'
            return acc
          },
          {} as { [key: string]: 'insert' | 'update' },
        ),
      }
    })
  },

  /**
   * Performs bulk delete operations with version history tracking.
   * Each deleted record's final state is preserved in version history.
   *
   * For more details about bulk operations and version history,
   * see: docs/version-history.md#bulk-operations
   */
  bulkDelete: async <T extends TableName>(
    table: T,
    data: (Record<string, unknown> & { id?: string })[],
    conflictTarget: (keyof InferTable<T>)[],
    db: PostgresJsDatabase<typeof schema>,
  ): Promise<BulkDeleteResult> => {
    const bulkOperationId = crypto.randomUUID()
    const deleted: string[] = []
    const notFound: string[] = []

    await Promise.all(
      data.map(async (recordData) => {
        const whereClause = and(
          ...conflictTarget.map((col) => {
            const tableSchema = schema[table]
            const column = tableSchema[
              col as keyof typeof tableSchema
            ] as PgColumn
            return eq(column, recordData[col as keyof typeof recordData])
          }),
        )

        const [existingRecord] = await db
          .select()
          .from(schema[table])
          .where(whereClause)
          .limit(1)

        if (!existingRecord) {
          notFound.push(recordData.id || 'unknown')
          return
        }

        const [latest] = await db
          .select({ version: versionHistory.version })
          .from(versionHistory)
          .where(
            and(
              eq(versionHistory.tableName, table),
              eq(versionHistory.recordId, existingRecord.id),
            ),
          )
          .orderBy(desc(versionHistory.version))
          .limit(1)

        await db.delete(schema[table]).where(whereClause)

        const currentState = existingRecord
        const metadata = {
          deletedAt: new Date(),
          bulkOperationId,
        }

        validateVersionOperation({
          operation: 'DELETE',
          currentState,
          previousState: null,
          metadata,
          table,
          recordId: existingRecord.id,
        })
        await db.insert(versionHistory).values({
          tableName: table,
          recordId: existingRecord.id,
          version: (latest?.version ?? 0) + 1,
          currentState,
          previousState: null,
          userId: context.userId ?? '',
          operation: 'DELETE',
          metadata,
        })

        deleted.push(existingRecord.id)
      }),
    )

    return { deleted, notFound }
  },
})

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
 * @param req - Express request object (optional). If provided, request metadata
 *             (IP, user agent, etc.) will be included in version history.
 * @returns A versioned database client with methods for tracked operations
 */
export const createVersionedDb = (req?: Request) => {
  const context = getContextFromRequest(req)
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
