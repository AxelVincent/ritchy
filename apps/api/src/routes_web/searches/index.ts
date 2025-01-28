import express, { type Router } from 'express'
import { createSearch } from './create'
import { getSearches } from './get_all'
import { getSearchContent } from './get_content'

const searchesRouter: Router = express.Router()

searchesRouter.get('/', getSearches)
searchesRouter.post('/', createSearch)
searchesRouter.get('/:id', getSearchContent)

export default searchesRouter
