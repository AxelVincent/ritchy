import postgres from 'postgres'

import { drizzle } from 'drizzle-orm/postgres-js'

import * as schema from './schema'

import { DRIZZLE_CONFIG } from '../config/drizzle'

const isDevelopment = process.env.NODE_ENV === 'development'

const connectionData = {
  host: DRIZZLE_CONFIG.HOST,
  port: DRIZZLE_CONFIG.PORT,
  database: DRIZZLE_CONFIG.DATABASE,
  username: DRIZZLE_CONFIG.USER,
  password: DRIZZLE_CONFIG.PASSWORD,
  max: DRIZZLE_CONFIG.MAX,
  min: DRIZZLE_CONFIG.MIN,
  idle_timeout: 30,
  connect_timeout: 10,
  max_lifetime: 3600,
  ...(isDevelopment && {
    debug: true,
    onnotice: (notice: unknown) => console.log('Postgres Notice:', notice),
    onparameter: (key: unknown, value: unknown) =>
      console.log('Query Parameter:', key, value),
    onquery: (query: unknown) => console.log('Executing Query:', query),
  }),
}

const queryConnection = postgres(connectionData)

export const db = drizzle(queryConnection, {
  schema,
})

/** @internal Public database connection for external access - kept for potential future use */
const _publicDb = drizzle({
  connection: {
    url: DRIZZLE_CONFIG.PUBLIC_URL,
    max: 1,
  },
  schema,
})

// Suppress unused variable warning - kept for potential future use
void _publicDb
