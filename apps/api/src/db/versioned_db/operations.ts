import { type InferInsertModel, and, desc, eq } from 'drizzle-orm'
import type { PgColumn, PgUpdateSetSource } from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { versionHistory } from '../schema'
import * as schema from '../schema'
import type {
  BulkDeleteResult,
  BulkUpsertResult,
  InferInsert,
  InferSelect,
  InferTable,
  TableName,
  VersionContext,
} from './types'
import {
  calculateChangedFields,
  chunkArray,
  createConflictWhereClause,
  createVersionEntry,
  prepareVersionMetadata,
} from './utils/helpers'
import { getLatestVersion, getRecordById } from './utils/helpers'
import { validateVersionOperation } from './utils/validation'

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
    const currentRecord = await getRecordById(db, table, where.id)
    if (!currentRecord) throw new Error('Record not found')

    const latestVersion = await getLatestVersion(db, table, where.id)

    const result = await db
      .update(schema[table])
      .set(data as unknown as PgUpdateSetSource<(typeof schema)[T]>)
      .where(eq(schema[table].id, where.id))
      .returning()

    if (!result[0]) throw new Error('Update failed')

    const changedFields = calculateChangedFields(result[0], currentRecord)
    const metadata = prepareVersionMetadata('UPDATE', {
      userId: context.userId,
      bulkOperationId: context.bulkOperationId,
      changedFields,
    })

    await createVersionEntry(db, {
      table,
      recordId: where.id,
      version: latestVersion + 1,
      currentState: result[0],
      previousState: currentRecord,
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
    const CHUNK_SIZE = 50

    return db.transaction(async (tx) => {
      const chunks = chunkArray(data, CHUNK_SIZE)
      const allResults: InferSelect<T>[] = []

      for (const chunk of chunks) {
        const previousStates = await Promise.all(
          chunk.map(async (originalData) => {
            const whereClause = createConflictWhereClause(
              table,
              conflictTarget,
              originalData,
            )
            const [previousState] = await tx
              .select()
              .from(schema[table])
              .where(whereClause)
              .limit(1)
            return { originalData, previousState }
          }),
        )

        const results = await tx
          .insert(schema[table])
          .values(chunk as unknown as InferInsertModel<(typeof schema)[T]>[])
          .onConflictDoUpdate({
            target: conflictTarget.map(
              (col) =>
                (schema[table] as { [K in keyof InferTable<T>]: PgColumn })[
                  col
                ],
            ),
            set: {
              ...Object.fromEntries(
                Object.entries(chunk[0]).filter(
                  ([key]) =>
                    !conflictTarget.includes(key as keyof InferTable<T>),
                ),
              ),
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

        allResults.push(...results)
      }

      return {
        records: allResults,
        operations: allResults.reduce(
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
        const whereClause = createConflictWhereClause(
          table,
          conflictTarget,
          recordData,
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

export default createOperations
