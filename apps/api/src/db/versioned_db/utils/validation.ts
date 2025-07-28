import { z } from 'zod'
import type { VersionMetadata, VersionOperation } from '../../schema'

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
])

type VersionOperationInput = {
  operation: VersionOperation
  currentState: Record<string, unknown>
  previousState: Record<string, unknown> | null
  metadata: VersionMetadata
  table: string
  recordId: string
}

export const validateVersionOperation = (input: VersionOperationInput) => {
  const operation = input.previousState ? 'UPDATE' : 'INSERT'

  return versionOperationSchema.parse({
    ...input,
    operation,
  })
}
