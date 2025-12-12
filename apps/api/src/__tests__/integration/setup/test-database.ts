import path from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from '../../../db/schema'

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://test:test@localhost:5434/ritchy_test'

let connection: postgres.Sql | null = null
let testDb: ReturnType<typeof drizzle<typeof schema>> | null = null

export const setupTestDatabase = async () => {
  connection = postgres(TEST_DB_URL, {
    max: 5,
    // Silence NOTICE messages from postgres (e.g., "schema already exists")
    onnotice: () => {},
  })
  testDb = drizzle(connection, { schema })

  // Run migrations
  const migrationsFolder = path.resolve(__dirname, '../../../../drizzle')
  await migrate(testDb, { migrationsFolder })

  return testDb
}

export const teardownTestDatabase = async () => {
  if (connection) await connection.end()
  connection = null
  testDb = null
}

export const getTestDb = () => {
  if (!testDb) throw new Error('Test database not initialized')
  return testDb
}
