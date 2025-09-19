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
import { getListContent } from './get_content'
import { upsertList } from './upsertList'

const listsRouter: Router = express.Router()

listsRouter.post('/', upsertList)
listsRouter.get('/', getLists)
listsRouter.get('/:id', getListContent)
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
