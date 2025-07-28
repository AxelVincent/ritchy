import { index, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { pgTable } from 'drizzle-orm/pg-core'
import { leadStatusEnum } from './enum'
import { userPlace } from './place'

export const status = pgTable(
  'status',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userPlaceId: uuid('user_place_id')
      .notNull()
      .references(() => userPlace.id, { onDelete: 'cascade' }),
    status: leadStatusEnum('status').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.userPlaceId, table.status),
    index('idx_user_place_status').on(table.userPlaceId),
  ],
)
