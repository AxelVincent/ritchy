import express, { type Router } from 'express'
import { validateRequest } from '../../../middleware/zodValidation'

// Import contracts
import {
  GetEnrichmentApiResponseSchema,
  GetEnrichmentParamsSchema,
} from './contract'

// Import handlers
import { getEnrichmentHandler } from './enrichment'

const enrichmentRouter: Router = express.Router({ mergeParams: true })

enrichmentRouter.get(
  '/',
  validateRequest({
    paramsSchema: GetEnrichmentParamsSchema,
    responseSchema: GetEnrichmentApiResponseSchema,
  }),
  getEnrichmentHandler,
)

export default enrichmentRouter
