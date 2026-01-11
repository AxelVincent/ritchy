import { z } from 'zod'

// ============================================================================
// List Types
// ============================================================================

// List response schema (from API)
export const ListResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  emoji: z.string(),
  itemCount: z.coerce.number(), // SQL COUNT returns bigint as string, need to coerce
  createdAt: z.string(),
  updatedAt: z.string(),
})

// Array of lists
export const ListsResponseSchema = z.array(ListResponseSchema)

// Alias for backward compatibility
export const ListSchema = ListResponseSchema
export type List = z.infer<typeof ListResponseSchema>
export type Lists = z.infer<typeof ListsResponseSchema>

// ============================================================================
// Add Items Request
// ============================================================================

// Body schema for add items
export const AddItemsToListRequestBodySchema = z.object({
  items: z.array(
    z.object({
      userPlaceId: z.string(),
    }),
  ),
})

// Params schema for add items
export const AddItemsToListRequestParamsSchema = z.object({
  id: z.string().uuid(),
})

// Combined request schema (body + params)
export const AddItemsToListRequestSchema = z.object({
  ...AddItemsToListRequestParamsSchema.shape,
  ...AddItemsToListRequestBodySchema.shape,
})

export type AddItemsToListRequest = z.infer<typeof AddItemsToListRequestSchema>
export type AddItemsToListRequestBody = z.infer<
  typeof AddItemsToListRequestBodySchema
>
export type AddItemsToListRequestParams = z.infer<
  typeof AddItemsToListRequestParamsSchema
>

// ============================================================================
// Delete Items Request
// ============================================================================

// Body schema for delete items - items is array of strings (userPlaceIds)
export const DeleteItemsFromListRequestBodySchema = z.object({
  items: z.array(z.string()),
})

// Params schema for delete items
export const DeleteItemsFromListRequestParamsSchema = z.object({
  id: z.string().uuid(),
})

// Combined request schema (body + params)
export const DeleteItemsFromListRequestSchema = z.object({
  ...DeleteItemsFromListRequestParamsSchema.shape,
  ...DeleteItemsFromListRequestBodySchema.shape,
})

export type DeleteItemsFromListRequest = z.infer<
  typeof DeleteItemsFromListRequestSchema
>
export type DeleteItemsFromListRequestBody = z.infer<
  typeof DeleteItemsFromListRequestBodySchema
>
export type DeleteItemsFromListRequestParams = z.infer<
  typeof DeleteItemsFromListRequestParamsSchema
>
