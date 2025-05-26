# Version History System

## Overview

The version history system maintains a complete audit trail of all database changes, with strict validation and type safety. It automatically tracks every modification to database records, including inserts, updates, deletes, and bulk operations, while maintaining a complete history of changes with metadata.

## Core Concepts

### Version History Table

```sql
CREATE TABLE "version_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "table_name" text NOT NULL,
  "record_id" uuid NOT NULL,
  "version" integer NOT NULL,
  "current_state" jsonb NOT NULL,
  "previous_state" jsonb,
  "user_id" uuid REFERENCES "user"("id") ON DELETE set null,
  "operation" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "metadata" jsonb
);
```

### Key Components

1. **Record States**
   - `current_state`: The new state of the record after the operation
   - `previous_state`: The previous state of the record (null for inserts, present for updates/deletes)

2. **Change Tracking**
   - `operation`: Type of change (INSERT, UPDATE, UPSERT, DELETE, ROLLBACK, BULK)
   - `user_id`: Reference to the user who made the change
   - `created_at`: Timestamp of when the change occurred
   - `version`: Sequential version number for the record

3. **Context**
   - `metadata`: Additional context about the change
     ```typescript
     {
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
     ```

4. **Version Context**
   ```typescript
   interface VersionContext {
     userId?: string
     sessionId?: string
     ipAddress?: string
     userAgent?: string
     changeSource?: 'user' | 'system' | 'integration' | 'bulk'
     requestId?: string
     additionalContext?: Record<string, unknown>
     bulkOperationId?: string
   }
   ```

## Database Constraints

1. **Unique Constraints**
   - `uniq_record_version`: Ensures unique version per record (table_name, record_id, version)

2. **Indexes**
   - `idx_version_history_table_record`: For quick lookups by table and record
   - `idx_version_history_user_id`: For user-based queries
   - `idx_version_history_created_at`: For time-based queries

3. **Check Constraints**
   - `version_positive`: Ensures version > 0
   - `valid_operation`: Ensures operation is one of: 'INSERT', 'UPDATE', 'DELETE', 'ROLLBACK', 'BULK'

## Validation

The system uses Zod schemas to validate all operations:

```typescript
// State validation
const versionStateSchema = z.object({
  id: z.string().uuid(),
}).passthrough()

// Operation-specific validation
const versionOperationSchema = z.discriminatedUnion('operation', [
  // INSERT/UPSERT (new record)
  z.object({
    operation: z.literal('INSERT'),
    currentState: versionStateSchema,
    previousState: z.null(),
    metadata: versionMetadataSchema,
    table: z.string(),
    recordId: z.string().uuid(),
  }),
  // UPDATE/UPSERT (existing record)
  z.object({
    operation: z.literal('UPDATE'),
    currentState: versionStateSchema,
    previousState: versionStateSchema,
    metadata: versionMetadataSchema.extend({
      changedFields: z.array(z.string()),
    }),
    table: z.string(),
    recordId: z.string().uuid(),
  }),
  // DELETE
  z.object({
    operation: z.literal('DELETE'),
    currentState: versionStateSchema,
    previousState: z.null(),
    metadata: versionMetadataSchema.extend({
      deletedAt: z.date(),
    }),
    table: z.string(),
    recordId: z.string().uuid(),
  }),
  // ROLLBACK
  z.object({
    operation: z.literal('ROLLBACK'),
    currentState: versionStateSchema,
    previousState: versionStateSchema,
    metadata: versionMetadataSchema.extend({
      rollbackFromVersion: z.number().int().positive(),
    }),
    table: z.string(),
    recordId: z.string().uuid(),
  }),
  // BULK
  z.object({
    operation: z.literal('BULK'),
    currentState: versionStateSchema,
    previousState: versionStateSchema.nullable(),
    metadata: versionMetadataSchema.extend({
      bulkOperationId: z.string().uuid(),
    }),
    table: z.string(),
    recordId: z.string().uuid(),
  }),
])
```

## Usage

### Basic Operations

```typescript
// Create a versioned database client
const versionedDb = createVersionedDb(req)

// Insert
await versionedDb.insert('status', {
  placeId: 'place123',
  userId: 'user123',
  status: 'NEW'
})

// Update
await versionedDb.update('status', 
  { status: 'CONTACTED' },
  { id: 'record123' }
)

// Delete
await versionedDb.delete('status', { id: 'record123' })

// Upsert
await versionedDb.upsert('status',
  {
    placeId: 'place123',
    userId: 'user123',
    status: 'NEW'
  },
  ['placeId', 'userId']  // Conflict target fields
)
```

### Bulk Operations

```typescript
// Bulk Upsert
const result = await versionedDb.bulkUpsert('status',
  [
    { placeId: 'place1', userId: 'user1', status: 'NEW' },
    { placeId: 'place2', userId: 'user2', status: 'CONTACTED' }
  ],
  ['placeId', 'userId']
)

// Bulk Delete
const { deleted, notFound } = await versionedDb.bulkDelete('status',
  [
    { placeId: 'place1', userId: 'user1' },
    { placeId: 'place2', userId: 'user2' }
  ],
  ['placeId', 'userId']
)
```

### Transaction Support

```typescript
await versionedDb.transaction(async (ops) => {
  // All operations in a transaction
  await ops.insert('table1', data1)
  await ops.update('table2', data2, { id: 'id2' })
  await ops.delete('table3', { id: 'id3' })
})
```

## Querying Version History

### Basic Queries

```sql
-- Get all versions of a record
SELECT 
  version,
  operation,
  current_state,
  previous_state,
  metadata->>'changedFields' as changed_fields,
  created_at,
  user_id
FROM version_history
WHERE table_name = 'status'
AND record_id = '123'
ORDER BY version DESC;

-- Get the last version before a specific date
SELECT 
  version,
  operation,
  current_state,
  previous_state,
  created_at
FROM version_history
WHERE table_name = 'status'
AND record_id = '123'
AND created_at < '2024-01-01'
ORDER BY version DESC
LIMIT 1;
```

### Audit Trail

```sql
-- Who modified what and when
SELECT 
  vh.table_name,
  vh.record_id,
  vh.operation,
  vh.created_at,
  u.email as modified_by,
  vh.metadata->>'ipAddress' as ip_address,
  vh.metadata->>'changedFields' as changed_fields
FROM version_history vh
LEFT JOIN "user" u ON u.id = vh.user_id
WHERE vh.table_name = 'status'
ORDER BY vh.created_at DESC;
```

### Bulk Operation Analysis

```sql
-- Get all records affected by a bulk operation
SELECT 
  record_id,
  current_state,
  previous_state,
  operation,
  created_at
FROM version_history
WHERE metadata->>'bulkOperationId' = '456'
ORDER BY created_at;
```

## Best Practices

1. **Always Use Transactions**
   ```typescript
   // ✅ Good
   await versionedDb.transaction(async (ops) => {
     await ops.delete('table1', { id: id1 })
     await ops.delete('table2', { id: id2 })
   })

   // ❌ Bad
   await versionedDb.delete('table1', { id: id1 })
   await versionedDb.delete('table2', { id: id2 })
   ```

2. **Handle Bulk Operations Carefully**
   - Use `bulkUpsert` and `bulkDelete` for multiple records
   - Consider performance implications for large datasets
   - Monitor version history table size
   - Use appropriate conflict targets

3. **Error Handling**
   ```typescript
   try {
     await versionedDb.transaction(async (ops) => {
       // Your operations
     })
   } catch (error) {
     if (error instanceof z.ZodError) {
       // Handle validation errors
     }
     // Handle other errors
   }
   ```

4. **Performance Considerations**
   - Monitor version history table size
   - Use appropriate indexes for common queries
   - Consider archiving old versions
   - Be mindful of bulk operation sizes

## Limitations

1. **Storage**
   - Each change creates a new version record
   - Consider storage implications for frequently updated records
   - Monitor database size growth

2. **Performance**
   - Additional database operations for each change
   - Impact on write performance
   - Consider read performance for version queries

3. **Complexity**
   - Requires careful transaction management
   - Need to handle bulk operations appropriately
   - Must consider cleanup strategies

## Future Improvements

1. **Archiving**
   - Implement version archiving strategy
   - Move old versions to archive tables
   - Compress archived versions

2. **Optimization**
   - Add more specific indexes
   - Implement version pruning
   - Optimize bulk operations

3. **Features**
   - Add rollback capabilities
   - Implement version comparison tools
   - Add version tagging 