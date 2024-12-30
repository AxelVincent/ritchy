import 'dotenv/config'

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const connectionData = {
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 1,
}

const migrationConnection = postgres(connectionData)

const main = async () => {
  await migrate(drizzle(migrationConnection), { migrationsFolder: 'drizzle' })
  await migrationConnection.end()
}

main()
