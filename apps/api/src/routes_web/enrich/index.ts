import {
  BulkEnrichmentApiResponseSchema,
  BulkEnrichmentRequestBodySchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'
import { bulkEnrich } from './bulk'
import { enrichCompany } from './company'
import { enrichContact } from './contact'
import {
  getBatchContactStatusHandler,
  getBatchEnrichmentStatusHandler,
  getCompanyStatusHandler,
  getContactStatusHandler,
  getEnrichmentStatusHandler,
} from './status'

const enrichRouter: Router = express.Router()

// Legacy status endpoints (for existing enrichment-unit flow)
enrichRouter.get('/status/:userPlaceId', getEnrichmentStatusHandler)
enrichRouter.get('/status', getBatchEnrichmentStatusHandler)

// Company enrichment endpoints
enrichRouter.post('/company', enrichCompany)
enrichRouter.get('/company/status/:userPlaceId', getCompanyStatusHandler)

// Contact enrichment endpoints
enrichRouter.post('/contact', enrichContact)
enrichRouter.get('/contact/status/:contactId', getContactStatusHandler)
enrichRouter.get('/contact/status', getBatchContactStatusHandler)

// Bulk enrichment (legacy - uses enrichment-unit worker)
enrichRouter.post(
  '/bulk',
  validateRequest({
    bodySchema: BulkEnrichmentRequestBodySchema,
    responseSchema: BulkEnrichmentApiResponseSchema,
  }),
  bulkEnrich,
)

export default enrichRouter
