import type { InferSelectModel } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { pgTable, uuid } from 'drizzle-orm/pg-core'
import { placeSourceEnum, priceLevelEnum } from './enum'
import { user } from './user'

export const place = pgTable('place', {
  id: uuid('id').defaultRandom().primaryKey(),
  source: placeSourceEnum('source').notNull(),
  sourceId: text('source_id').notNull().unique(),
  sourceUrl: text('source_url'),
  website: text('website'),
  name: text('name'),
  location: jsonb('location').$type<{
    latitude: number
    longitude: number
  }>(),
  types: text('types').array(),
  primaryType: text('primary_type'),
  priceLevel: priceLevelEnum('price_level'),
  priceRange: jsonb('price_range').$type<{
    startPrice?: {
      currencyCode: string
      units?: string
      nanos?: number
    }
    endPrice?: {
      currencyCode: string
      units?: string
      nanos?: number
    }
  }>(),
  rating: real('rating'),
  ratingCount: integer('rating_count'),
  phone: text('phone'),
  utcOffsetMinutes: integer('utc_offset_minutes'),
  openingHours: jsonb('opening_hours').$type<{
    periods?: {
      open?: {
        day: number
        hour: number
        minute: number
        date?: {
          year: number
          month: number
          day: number
        }
      }
      close?: {
        day: number
        hour: number
        minute: number
        date?: {
          year: number
          month: number
          day: number
        }
      }
    }[]
    weekdayDescriptions?: string[]
  }>(),
  formattedAddress: text('formatted_address'),
  shortFormattedAddress: text('short_formatted_address'),
  country: text('country'),
  locality: text('locality'),
  sublocality: text('sublocality'),
  postalCode: text('postal_code'),
  postalCodeSuffix: text('postal_code_suffix'),
  plusCode: text('plus_code'),
  street: text('street'),
  streetNumber: text('street_number'),
  neighborhood: text('neighborhood'),
  administrativeAreaLevel1: text('administrative_area_level_1'),
  administrativeAreaLevel2: text('administrative_area_level_2'),
  administrativeAreaLevel3: text('administrative_area_level_3'),
  reviews:
    jsonb('reviews').$type<
      {
        name: string
        rating: number
        text?: {
          text?: string
          languageCode?: string
        }
        originalText?: {
          text?: string
          languageCode?: string
        }
        authorAttribution?: {
          displayName?: string
          uri?: string
          photoUri?: string
        }
        publishTime: string
        googleMapsUri: string
      }[]
    >(),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Place = InferSelectModel<typeof place>

export const userPlace = pgTable(
  'user_place',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    placeId: uuid('place_id')
      .notNull()
      .references(() => place.id, { onDelete: 'cascade' }),
    enrichedAt: timestamp('enriched_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uniq_user_place').on(table.userId, table.placeId),
    unique().on(table.placeId, table.userId),
  ],
)
