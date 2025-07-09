import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'
import { PlaceSchema } from './places'

const pgFields = z.enum([
  'list.id',
  'search.id',
  'status.status',
  'contact_email.email',
  'contact_social.social_media_url',
  'note.note'
])

const redisFields = z.enum([
  'name' // This maps to $.data.displayName.text in our index
])

const allowedFields = z.union([pgFields, redisFields])

const operatorSchema = z.enum([
  'equals',
  'is_not',
  'greater_than',
  'less_than',
  'before',
  'after',
  'contains',
  'fuzzy',
  'is',
  'in'
])

const baseCondition = z.object({
  field: allowedFields,
  operator: operatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.date(),
    z.array(z.string())
  ])
})

type BaseCondition = z.infer<typeof baseCondition>

export type FilterCondition =
  | BaseCondition
  | {
      operator: 'AND' | 'OR'
      conditions: FilterCondition[]
    }

const recursiveCondition: z.ZodType<FilterCondition> = z.lazy(() =>
  z.union([
    baseCondition,
    z.object({
      operator: z.enum(['AND', 'OR']),
      conditions: z.array(recursiveCondition)
    })
  ])
)

export const PostGetPlacesRequestSchema = z.object({
  listId: z.string().uuid().optional(),
  searchId: z.string().uuid().optional(),
  filters: recursiveCondition.default({
    operator: 'AND',
    conditions: []
  }),
  pagination: z
    .object({
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional()
    })
    .optional(),
  sort: z
    .array(
      z.object({
        field: allowedFields,
        direction: z.enum(['asc', 'desc']).optional()
      })
    )
    .optional()
})

export const PostGetPlacesResponseSchema = z.object({
  places: z.array(PlaceSchema)
})

export const PostGetPlacesApiResponseSchema = z.union([
  PostGetPlacesResponseSchema,
  ApiErrorResponseSchema
])

export type PostGetPlacesRequest = z.infer<typeof PostGetPlacesRequestSchema>
export type PostGetPlacesResponse = z.infer<typeof PostGetPlacesResponseSchema>
export type PostGetPlacesApiResponse = z.infer<
  typeof PostGetPlacesApiResponseSchema
>
