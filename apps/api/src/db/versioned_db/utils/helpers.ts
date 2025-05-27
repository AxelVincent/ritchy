// apps/api/src/db/utils/version-history.ts

import { and, desc, eq } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { Request } from 'express'
import {
  type VersionMetadata,
  type VersionOperation,
  versionHistory,
} from '../../schema'
import * as schema from '../../schema'
import type {
  InferSelect,
  InferTable,
  TableName,
  VersionContext,
} from '../types'

export const getContextFromRequest = (req?: Request): VersionContext =>
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

/**
 * Gets the latest version number for a record
 */
export const getLatestVersion = async (
  db: PostgresJsDatabase<typeof schema>,
  table: string,
  recordId: string,
  options?: { forUpdate?: boolean },
) => {
  const query = db
    .select({ version: versionHistory.version })
    .from(versionHistory)
    .where(
      and(
        eq(versionHistory.tableName, table),
        eq(versionHistory.recordId, recordId),
      ),
    )
    .orderBy(desc(versionHistory.version))
    .limit(1)

  if (options?.forUpdate) {
    query.for('update')
  }

  const [latest] = await query
  return latest?.version ?? 0
}

/**
 * Creates a version history entry
 */
export const createVersionEntry = async (
  db: PostgresJsDatabase<typeof schema>,
  params: {
    table: string
    recordId: string
    version: number
    currentState: Record<string, unknown>
    previousState: Record<string, unknown> | null
    userId: string
    operation: VersionOperation
    metadata: VersionMetadata
  },
) => {
  const {
    table,
    recordId,
    version,
    currentState,
    previousState,
    userId,
    operation,
    metadata,
  } = params

  await db.insert(versionHistory).values({
    tableName: table,
    recordId,
    version,
    currentState,
    previousState,
    userId,
    operation,
    metadata,
  })
}

/**
 * Calculates changed fields between two states
 */
export const calculateChangedFields = (
  currentState: Record<string, unknown>,
  previousState: Record<string, unknown>,
  excludeFields: string[] = ['id'],
) => {
  return Object.keys(currentState).filter((key) => {
    if (excludeFields.includes(key)) return false
    const prev = previousState[key]
    const curr = currentState[key]
    return JSON.stringify(prev) !== JSON.stringify(curr)
  })
}

/**
 * Validates and prepares version operation metadata
 */
export const prepareVersionMetadata = (
  operation: VersionOperation,
  context: {
    userId?: string
    bulkOperationId?: string
    changedFields?: string[]
    deletedAt?: Date
  },
): VersionMetadata => {
  const metadata: VersionMetadata = {
    bulkOperationId: context.bulkOperationId,
  }

  if (operation === 'UPDATE' && context.changedFields) {
    metadata.changedFields = context.changedFields
  }

  if (operation === 'DELETE' && context.deletedAt) {
    metadata.deletedAt = context.deletedAt
  }

  return metadata
}

/**
 * Gets a record by its ID
 */
export const getRecordById = async <T extends TableName>(
  db: PostgresJsDatabase<typeof schema>,
  table: T,
  id: string,
): Promise<InferSelect<T> | undefined> => {
  const [record] = await db
    .select()
    .from(schema[table])
    .where(eq(schema[table].id, id))
    .limit(1)
  return record as InferSelect<T> | undefined
}

/**
 * Creates a where clause for conflict target fields
 */
export const createConflictWhereClause = <T extends TableName>(
  table: T,
  conflictTarget: (keyof InferTable<T>)[],
  data: Record<string, unknown>,
) => {
  return and(
    ...conflictTarget.map((col) => {
      const tableSchema = schema[table]
      const column = tableSchema[col as keyof typeof tableSchema] as PgColumn
      return eq(column, data[col as keyof typeof data])
    }),
  )
}

/**
 * Splits an array into chunks of specified size
 */
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Processes bulk operations in chunks to avoid transaction size limits
 */
export const processBulkOperationInChunks = async <T, R>(
  items: T[],
  chunkSize: number,
  processChunk: (chunk: T[]) => Promise<R[]>,
): Promise<R[]> => {
  const chunks = chunkArray(items, chunkSize)
  const results: R[] = []

  for (const chunk of chunks) {
    const chunkResults = await processChunk(chunk)
    results.push(...chunkResults)
  }

  return results
}
