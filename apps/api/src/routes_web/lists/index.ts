import {
  AddItemFromGeocodeApiResponseSchema,
  AddItemFromGeocodeRequestBodySchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'
import { addItemFromGeocode } from './add_item_from_geocode'
import { addItemsToList } from './add_items'
import { deleteList } from './delete'
import { deleteItemsFromList } from './delete_items'
import { getLists } from './get_all'
import { upsertList } from './upsertList'

const listsRouter: Router = express.Router()

listsRouter.post('/', upsertList)
listsRouter.get('/', getLists)
// GET /:id removed - use GET /user-places?listId=:id instead
// GET /:id/filter-options removed - use GET /user-places/filter-options?listId=:id instead
// GET /:id/markers removed - use GET /user-places/markers?listId=:id instead
// GET /:id/items/:itemId/page removed - use GET /user-places/items/:itemId/page?listId=:id instead
listsRouter.post('/:id/items', addItemsToList)
listsRouter.delete('/:id/items', deleteItemsFromList)
listsRouter.delete('/:id', deleteList)
listsRouter.post(
  '/add-item-from-geocode',
  validateRequest({
    bodySchema: AddItemFromGeocodeRequestBodySchema,
    responseSchema: AddItemFromGeocodeApiResponseSchema,
  }),
  addItemFromGeocode,
)

export default listsRouter
