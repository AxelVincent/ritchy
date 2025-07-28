import {
  boolean,
  index,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
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

export const userDemoCode = pgTable(
  'user_demo_code',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' })
      .unique(),
    code: text('code').notNull(),
    isValidated: boolean('is_validated').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    validatedAt: timestamp('validated_at'),
  },
  (table) => [
    index('idx_user_demo_code_user_id').on(table.userId),
    index('idx_user_demo_code_code').on(table.code),
  ],
)
