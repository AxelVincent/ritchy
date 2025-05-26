import postgres from 'postgres'

import { drizzle } from 'drizzle-orm/postgres-js'

import * as schema from './schema'

const isDevelopment = process.env.NODE_ENV === 'development'

const connectionData = {
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 1,
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
