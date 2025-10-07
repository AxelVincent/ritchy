import {
  BulkEnrichmentApiResponseSchema,
  BulkEnrichmentRequestBodySchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'
import { bulkEnrich } from './bulk'
import {
  getBatchEnrichmentStatusHandler,
  getEnrichmentStatusHandler,
} from './status'

const enrichRouter: Router = express.Router()

// Status endpoints (must be before /bulk for route specificity)
enrichRouter.get('/status/:userPlaceId', getEnrichmentStatusHandler)
enrichRouter.get('/status', getBatchEnrichmentStatusHandler)

enrichRouter.post(
  '/bulk',
  validateRequest({
    bodySchema: BulkEnrichmentRequestBodySchema,
    responseSchema: BulkEnrichmentApiResponseSchema,
  }),
  bulkEnrich,
)

export default enrichRouter
