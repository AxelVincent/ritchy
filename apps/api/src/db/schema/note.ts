import { index, text, timestamp } from 'drizzle-orm/pg-core'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import { userPlace } from './place'
import { user } from './user'

export const note = pgTable(
  'note',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userPlaceId: uuid('user_place_id')
      .notNull()
      .references(() => userPlace.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    note: text('note').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_note_user_place_id').on(table.userPlaceId),
    index('idx_note_user_id').on(table.userId),
    index('idx_note_user_place').on(table.userPlaceId, table.userId),
  ],
)
