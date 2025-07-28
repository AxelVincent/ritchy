import {
  index,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import { internalFieldEnum } from './enum'
import { userPlace } from './place'
import { user } from './user'

export const hubspotToken = pgTable(
  'hubspot_token',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' })
      .unique(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    portalId: text('portal_id'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uniq_user_id_hubspot_token').on(table.userId),
    index('idx_hubspot_token_portal_id').on(table.portalId),
  ],
)

export const hubspotFieldMapping = pgTable(
  'hubspot_field_mapping',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    hubspotTokenId: uuid('hubspot_token_id')
      .notNull()
      .references(() => hubspotToken.id, { onDelete: 'cascade' }),
    internalField: internalFieldEnum('internal_field').notNull(),
    hubspotField: text('hubspot_field').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.hubspotTokenId, table.internalField),
    index('idx_hubspot_field_mapping_token_id').on(table.hubspotTokenId),
  ],
)

export const hubspotLeadMapping = pgTable(
  'hubspot_lead_mapping',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userPlaceId: uuid('user_place_id')
      .notNull()
      .references(() => userPlace.id, { onDelete: 'cascade' }),
    hubspotCompanyId: text('hubspot_company_id').notNull(),
    hubspotContactId: text('hubspot_contact_id'),
    hubspotTokenId: uuid('hubspot_token_id')
      .notNull()
      .references(() => hubspotToken.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.userPlaceId, table.hubspotTokenId),
    index('idx_hubspot_lead_place_id').on(table.userPlaceId),
    index('idx_hubspot_lead_company_id').on(table.hubspotCompanyId),
    index('idx_hubspot_lead_contact_id').on(table.hubspotContactId),
    index('idx_hubspot_lead_token_id').on(table.hubspotTokenId),
  ],
)
