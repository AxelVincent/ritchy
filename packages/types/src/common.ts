import { z } from 'zod'

export const ApiErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        path: z.array(z.string().or(z.number())),
      }),
    )
    .optional(),
})

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

export const CoordinateSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
})

export const RectangleSchema = z.object({
  northEast: CoordinateSchema,
  southWest: CoordinateSchema,
})

export type Coordinate = z.infer<typeof CoordinateSchema>
export type Rectangle = z.infer<typeof RectangleSchema>

// Pagination types
export const SortOrderSchema = z.enum(['asc', 'desc'])

export const PaginationParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: SortOrderSchema.default('asc'),
})

export const PaginationMetaSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
})

export type SortOrder = z.infer<typeof SortOrderSchema>
export type PaginationParams = z.infer<typeof PaginationParamsSchema>
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>
