import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'

// Import contracts
import {
  AddItemFromGeocodeApiResponseSchema,
  AddItemFromGeocodeRequestBodySchema,
} from './add-item-from-geocode/contract'
import {
  AddItemsApiResponseSchema,
  AddItemsRequestBodySchema,
} from './add-items/contract'
import {
  CreateListApiResponseSchema,
  CreateListRequestSchema,
} from './create/contract'
import {
  DeleteItemsApiResponseSchema,
  DeleteItemsRequestBodySchema,
} from './delete-items/contract'
import {
  DeleteListApiResponseSchema,
  DeleteListRequestParamsSchema,
} from './delete/contract'
import { ListsApiResponseSchema } from './list/contract'

// Import handlers
import { addItemFromGeocodeHandler } from './add-item-from-geocode/add-item-from-geocode'
import { addItemsHandler } from './add-items/add-items'
import { createListHandler } from './create/create'
import { deleteItemsHandler } from './delete-items/delete-items'
import { deleteListHandler } from './delete/delete'
import { getListsHandler } from './list/list'

const listsRouter: Router = express.Router()

listsRouter.post(
  '/',
  validateRequest({
    bodySchema: CreateListRequestSchema,
    responseSchema: CreateListApiResponseSchema,
  }),
  createListHandler,
)

listsRouter.get(
  '/',
  validateRequest({
    responseSchema: ListsApiResponseSchema,
  }),
  getListsHandler,
)

// GET /:id removed - use GET /user-places?listId=:id instead
// GET /:id/filter-options removed - use GET /user-places/filter-options?listId=:id instead
// GET /:id/markers removed - use GET /user-places/markers?listId=:id instead
// GET /:id/items/:itemId/page removed - use GET /user-places/items/:itemId/page?listId=:id instead

listsRouter.post(
  '/:id/items',
  validateRequest({
    bodySchema: AddItemsRequestBodySchema,
    responseSchema: AddItemsApiResponseSchema,
  }),
  addItemsHandler,
)

listsRouter.delete(
  '/:id/items',
  validateRequest({
    bodySchema: DeleteItemsRequestBodySchema,
    responseSchema: DeleteItemsApiResponseSchema,
  }),
  deleteItemsHandler,
)

listsRouter.delete(
  '/:id',
  validateRequest({
    paramsSchema: DeleteListRequestParamsSchema,
    responseSchema: DeleteListApiResponseSchema,
  }),
  deleteListHandler,
)

listsRouter.post(
  '/add-item-from-geocode',
  validateRequest({
    bodySchema: AddItemFromGeocodeRequestBodySchema,
    responseSchema: AddItemFromGeocodeApiResponseSchema,
  }),
  addItemFromGeocodeHandler,
)

export default listsRouter
