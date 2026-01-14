import type { InferSelectModel } from 'drizzle-orm'
import {
  boolean,
  index,
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
import { businessStatusEnum, placeSourceEnum, priceLevelEnum } from './enum'
import { user } from './user'

export const place = pgTable(
  'place',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    source: placeSourceEnum('source').notNull(),
    source_id: text('source_id').notNull().unique(),
    source_url: text('source_url'),
    website: text('website'),
    name: text('name'),
    location: jsonb('location').$type<{
      latitude: number
      longitude: number
    }>(),
    types: text('types').array(),
    primary_type: text('primary_type'),
    business_status: businessStatusEnum('business_status'),
    price_level: priceLevelEnum('price_level'),
    price_range: jsonb('price_range').$type<{
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
    rating_count: integer('rating_count'),
    phone: text('phone'),
    utc_offset_minutes: integer('utc_offset_minutes'),
    opening_hours: jsonb('opening_hours').$type<{
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
    formatted_address: text('formatted_address'),
    short_formatted_address: text('short_formatted_address'),
    country: text('country'),
    locality: text('locality'),
    sublocality: text('sublocality'),
    postal_code: text('postal_code'),
    postal_code_suffix: text('postal_code_suffix'),
    plus_code: text('plus_code'),
    street: text('street'),
    street_number: text('street_number'),
    neighborhood: text('neighborhood'),
    administrative_area_level_1: text('administrative_area_level_1'),
    administrative_area_level_2: text('administrative_area_level_2'),
    administrative_area_level_3: text('administrative_area_level_3'),
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
    google_maps_links: jsonb('google_maps_links').$type<{
      directionsUri?: string
      placeUri?: string
      writeAReviewUri?: string
      reviewsUri?: string
      photosUri?: string
    }>(),
    editorial_summary: text('editorial_summary'),
    // Complete Google Place data stored as JSONB for full API passthrough
    google_place_data: jsonb('google_place_data'),
    is_deleted: boolean('is_deleted').notNull().default(false),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('uniq_place_source_id').on(table.source_id)],
)

export type Place = InferSelectModel<typeof place>

export const userPlace = pgTable(
  'user_place',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    place_id: uuid('place_id')
      .notNull()
      .references(() => place.id, { onDelete: 'cascade' }),
    enriched_at: timestamp('enriched_at'),
    last_interaction_at: timestamp('last_interaction_at'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uniq_user_place').on(table.user_id, table.place_id),
    unique().on(table.place_id, table.user_id),
    index('idx_user_place_place_id').on(table.place_id),
    index('idx_user_place_user_id').on(table.user_id),
    index('idx_user_place_last_interaction').on(table.last_interaction_at),
  ],
)
