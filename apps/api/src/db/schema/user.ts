import { text, timestamp } from 'drizzle-orm/pg-core'
import { pgTable, uuid } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
