import 'dotenv/config'

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const connectionData = {
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT),
	database: process.env.DB_NAME,
	username: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	max: 1
}

const migrationConnection = postgres(connectionData)

const main = async () => {
	await migrate(drizzle(migrationConnection), { migrationsFolder: 'drizzle' })
	await migrationConnection.end()
}

main()
