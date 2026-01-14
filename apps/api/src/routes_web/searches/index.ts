import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'

// Import contracts
import {
  CreateSearchApiResponseSchema,
  CreateSearchRequestSchema,
} from './create/contract'
import { GetSearchesApiResponseSchema } from './get-all/contract'

// Import handlers
import { createSearchHandler } from './create/create'
import { getSearchesHandler } from './get-all/get-all'

const searchesRouter: Router = express.Router()

searchesRouter.get(
  '/',
  validateRequest({
    responseSchema: GetSearchesApiResponseSchema,
  }),
  getSearchesHandler,
)

searchesRouter.post(
  '/',
  validateRequest({
    bodySchema: CreateSearchRequestSchema,
    responseSchema: CreateSearchApiResponseSchema,
  }),
  createSearchHandler,
)

// GET /:id removed - use GET /user-places?searchId=:id instead

export default searchesRouter
