import express, { type Router } from 'express'
import { createSearch } from './create'
import { getSearches } from './get_all'

const searchesRouter: Router = express.Router()

searchesRouter.get('/', getSearches)
searchesRouter.post('/', createSearch)
// GET /:id removed - use GET /user-places?searchId=:id instead

export default searchesRouter
