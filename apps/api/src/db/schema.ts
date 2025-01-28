import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const list = pgTable('list', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  userId: text('user_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const listPlace = pgTable(
  'list_place',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listId: uuid('list_id')
      .notNull()
      .references(() => list.id),
    placeId: text('place_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqListPlace: uniqueIndex('uniq_list_place').on(
      table.listId,
      table.placeId,
    ),
  }),
)

export const note = pgTable('note', {
  id: uuid('id').defaultRandom().primaryKey(),
  placeId: text('place_id').notNull(),
  userId: text('user_id').notNull(),
  note: text('note').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const searchModelEnum = pgEnum('search_model', [
  'DEFAULT',
  'NAVIGATOR',
  'EXPLORER',
  'PRO',
])

export const search = pgTable('search', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  latitude: numeric('latitude').notNull(),
  longitude: numeric('longitude').notNull(),
  radiusInMeters: integer('radius_in_meters').notNull(),
  placeName: text('place_name').notNull(),
  keyword: text('keyword').notNull(),
  model: searchModelEnum('model').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
