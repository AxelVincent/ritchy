import express, { type Router } from 'express'
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

export default listsRouter
