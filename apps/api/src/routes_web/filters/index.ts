import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'

// Import contracts
import {
  GenerateFiltersApiResponseSchema,
  GenerateFiltersRequestSchema,
} from './generate/contract'

// Import handlers
import { generateFiltersHandler } from './generate/generate'

const filtersRouter: Router = express.Router()

// POST /filters/generate - Generate filters from natural language query
filtersRouter.post(
  '/generate',
  validateRequest({
    bodySchema: GenerateFiltersRequestSchema,
    responseSchema: GenerateFiltersApiResponseSchema,
  }),
  generateFiltersHandler,
)

export default filtersRouter
