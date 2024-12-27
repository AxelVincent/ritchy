import { z } from 'zod'
import { ApiErrorResponseSchema } from '../common'
import { PlaceSchema } from './places'

// Basic/Common Schemas
export const ListResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  itemCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ListsResponseSchema = z.array(ListResponseSchema)

export const ListContentResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  items: z.array(PlaceSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// Request Schemas
export const CreateListRequestSchema = z.object({
  name: z.string().min(1),
  emoji: z.string().min(1),
})

export const AddItemsToListRequestBodySchema = z.object({
  items: z.array(z.string()),
})

export const AddItemsToListRequestParamsSchema = z.object({
  id: z.string(),
})

export const AddItemsToListRequestSchema = z.object({
  ...AddItemsToListRequestParamsSchema.shape,
  ...AddItemsToListRequestBodySchema.shape,
})

export const RemoveItemsFromListRequestBodySchema = z.object({
  items: z.array(z.string()),
})

export const RemoveItemsFromListRequestParamsSchema = z.object({
  id: z.string(),
})

export const RemoveItemsFromListRequestSchema = z.object({
  ...RemoveItemsFromListRequestParamsSchema.shape,
  ...RemoveItemsFromListRequestBodySchema.shape,
})

// Response Schemas with Error Handling
export const CreateListResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const RemoveItemsFromListResponseSchema = z.object({
  success: z.boolean(),
})

// API Union Types
export const ListContentApiResponseSchema = z.union([
  ListContentResponseSchema,
  ApiErrorResponseSchema,
])

export const AddItemsToListResponseSchema = z.union([
  z.object({
    success: z.boolean(),
  }),
  ApiErrorResponseSchema,
])

export const CreateListApiResponseSchema = z.union([
  CreateListResponseSchema,
  ApiErrorResponseSchema,
])

export const ListsApiResponseSchema = z.union([
  ListsResponseSchema,
  ApiErrorResponseSchema,
])

export const AddItemsToListApiResponseSchema = z.union([
  AddItemsToListResponseSchema,
  ApiErrorResponseSchema,
])

export const RemoveItemsFromListApiResponseSchema = z.union([
  RemoveItemsFromListResponseSchema,
  ApiErrorResponseSchema,
])

// Type Inferences
export type List = z.infer<typeof ListResponseSchema>
export type Lists = z.infer<typeof ListsResponseSchema>
export type CreateListRequest = z.infer<typeof CreateListRequestSchema>
export type CreateListResponse = z.infer<typeof CreateListResponseSchema>
export type CreateListApiResponse = z.infer<typeof CreateListApiResponseSchema>
export type AddItemsToListRequest = z.infer<typeof AddItemsToListRequestSchema>
export type AddItemsToListApiResponse = z.infer<
  typeof AddItemsToListApiResponseSchema
>
export type AddItemsToListRequestBody = z.infer<
  typeof AddItemsToListRequestBodySchema
>
export type AddItemsToListRequestParams = z.infer<
  typeof AddItemsToListRequestParamsSchema
>
export type RemoveItemsFromListRequest = z.infer<
  typeof RemoveItemsFromListRequestSchema
>
export type RemoveItemsFromListResponse = z.infer<
  typeof RemoveItemsFromListResponseSchema
>
export type ListContentApiResponse = z.infer<
  typeof ListContentApiResponseSchema
>
export type AddItemsToListResponse = z.infer<
  typeof AddItemsToListResponseSchema
>
export type ListsApiResponse = z.infer<typeof ListsApiResponseSchema>
export type RemoveItemsFromListRequestBody = z.infer<
  typeof RemoveItemsFromListRequestBodySchema
>
export type RemoveItemsFromListRequestParams = z.infer<
  typeof RemoveItemsFromListRequestParamsSchema
>
export type RemoveItemsFromListApiResponse = z.infer<
  typeof RemoveItemsFromListApiResponseSchema
>
