import type { InferInsertModel, Table } from 'drizzle-orm'
import type * as schema from '../schema'

export type TableName = {
  [K in keyof typeof schema]: (typeof schema)[K] extends Table ? K : never
}[keyof typeof schema]

export type ChangeSource = 'user' | 'system' | 'integration' | 'bulk'

export type BulkDeleteResult = {
  deleted: string[]
  notFound: string[]
}

export type BulkUpsertResult<T extends TableName> = {
  records: (typeof schema)[T]['$inferSelect'][]
  operations: { [key: string]: 'insert' | 'update' }
}

export interface VersionContext {
  userId: string
  sessionId: string
  changeSource: ChangeSource
  bulkOperationId?: string
  metadata: {
    timestamp: Date
    ipAddress: string
    userAgent: string
    requestId: string
  }
  additionalContext?: Record<string, unknown>
}

export type InferTable<T extends TableName> = (typeof schema)[T]
export type InferSelect<T extends TableName> = InferTable<T>['$inferSelect']
export type InferInsert<T extends TableName> = InferInsertModel<InferTable<T>>
