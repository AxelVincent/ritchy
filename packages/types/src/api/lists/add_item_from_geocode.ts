import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

export const AddItemFromGeocodeRequestBodySchema = z.object({
  googleMapsPlaceId: z.string(),
  listId: z.string(),
})

export const AddItemFromGeocodeResponseSchema = z.object({
  success: z.boolean(),
})

export const AddItemFromGeocodeApiResponseSchema = z.union([
  AddItemFromGeocodeResponseSchema,
  ApiErrorResponseSchema,
])

export type AddItemFromGeocodeRequestBody = z.infer<
  typeof AddItemFromGeocodeRequestBodySchema
>
export type AddItemFromGeocodeResponse = z.infer<
  typeof AddItemFromGeocodeResponseSchema
>
export type AddItemFromGeocodeApiResponse = z.infer<
  typeof AddItemFromGeocodeApiResponseSchema
>
