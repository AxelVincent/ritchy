import express, { type Router } from 'express'
import { addItemsToList } from './add_items'
import { createList } from './create'
import { getLists } from './get_all'
import { getListContent } from './get_content'
import { removeItemsFromList } from './remove_items'

const listsRouter: Router = express.Router()

listsRouter.post('/', createList)
listsRouter.get('/', getLists)
listsRouter.get('/:id', getListContent)
listsRouter.post('/:id', addItemsToList)
listsRouter.delete('/:id', removeItemsFromList)

export default listsRouter
