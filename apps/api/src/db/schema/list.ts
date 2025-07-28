import {
  index,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import { userPlace } from './place'
import { search } from './search'
import { user } from './user'

export const list = pgTable('list', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const listPlace = pgTable(
  'list_place',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listId: uuid('list_id')
      .notNull()
      .references(() => list.id, { onDelete: 'cascade' }),
    userPlaceId: uuid('user_place_id')
      .notNull()
      .references(() => userPlace.id, { onDelete: 'cascade' }),
    searchId: uuid('search_id').references(() => search.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.listId, table.userPlaceId),
    index('idx_list_place_list_id').on(table.listId),
  ],
)
