import { index, text, timestamp } from 'drizzle-orm/pg-core'
import { jsonb, pgTable, uuid } from 'drizzle-orm/pg-core'
import { searchModelEnum } from './enum'
import { place, userPlace } from './place'
import { user } from './user'

export const search = pgTable(
  'search',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    placeName: text('place_name').notNull(),
    keyword: text('keyword').notNull(),
    model: searchModelEnum('model').notNull(),
    rectangle: jsonb('rectangle').notNull().$type<{
      northEast: { latitude: number; longitude: number }
      southWest: { latitude: number; longitude: number }
    }>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('idx_search_user_id').on(table.userId)],
)

export const searchPlace = pgTable(
  'search_place',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    searchId: uuid('search_id')
      .notNull()
      .references(() => search.id, { onDelete: 'cascade' }),
    userPlaceId: uuid('user_place_id')
      .notNull()
      .references(() => userPlace.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_search_place_search_id').on(table.searchId),
    index('idx_search_place_user_place_id').on(table.userPlaceId),
  ],
)
