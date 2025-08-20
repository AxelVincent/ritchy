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
  max: 500,
  min: 10,
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

export const publicDb = drizzle({
  connection: {
    url: DRIZZLE_CONFIG.PUBLIC_URL,
    max: 1,
  },
  schema,
})
