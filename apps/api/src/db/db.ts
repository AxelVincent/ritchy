import postgres from 'postgres'

import { drizzle } from 'drizzle-orm/postgres-js'

import * as schema from './schema'

const connectionData = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1
}

const queryConnection = postgres(connectionData)

export const db = drizzle(queryConnection, {
  schema
})
