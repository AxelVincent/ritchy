import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const list = pgTable('list', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  userId: text('user_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const listPlace = pgTable('list_place', {
  id: serial('id').primaryKey(),
  listId: integer('list_id')
    .notNull()
    .references(() => list.id),
  placeId: text('place_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
