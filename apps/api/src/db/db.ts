import postgres from 'postgres'

import { drizzle } from 'drizzle-orm/postgres-js'

import * as schema from './schema'

const connectionData = {
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 1,
}

const queryConnection = postgres(connectionData)

export const db = drizzle(queryConnection, {
  schema,
})
