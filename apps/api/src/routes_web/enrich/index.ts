import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'

// Import contracts
import {
  BulkEnrichmentApiResponseSchema,
  BulkEnrichmentRequestSchema,
} from './bulk/contract'

// Import handlers
import { bulkEnrichHandler } from './bulk/bulk'
import { getCompanyStatusHandler } from './company-status/company-status'
import { enrichCompanyHandler } from './company/company'
import { getBatchContactStatusHandler } from './contact-status-batch/contact-status-batch'
import { getContactStatusHandler } from './contact-status/contact-status'
import { enrichContactHandler } from './contact/contact'
import { getBatchEnrichmentStatusHandler } from './status-batch/status-batch'
import { getEnrichmentStatusHandler } from './status/status'

const enrichRouter: Router = express.Router()

// Legacy status endpoints (for existing enrichment-unit flow)
enrichRouter.get('/status/:userPlaceId', getEnrichmentStatusHandler)
enrichRouter.get('/status', getBatchEnrichmentStatusHandler)

// Company enrichment endpoints
enrichRouter.post('/company', enrichCompanyHandler)
enrichRouter.get('/company/status/:userPlaceId', getCompanyStatusHandler)

// Contact enrichment endpoints
enrichRouter.post('/contact', enrichContactHandler)
enrichRouter.get('/contact/status/:contactId', getContactStatusHandler)
enrichRouter.get('/contact/status', getBatchContactStatusHandler)

// Bulk enrichment (legacy - uses enrichment-unit worker)
enrichRouter.post(
  '/bulk',
  validateRequest({
    bodySchema: BulkEnrichmentRequestSchema,
    responseSchema: BulkEnrichmentApiResponseSchema,
  }),
  bulkEnrichHandler,
)

export default enrichRouter
