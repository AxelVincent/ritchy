import {
  BatchEnrichmentRequestBodySchema,
  BatchEnrichmentResponseApiResponseSchema,
  BulkEnrichmentApiResponseSchema,
  BulkEnrichmentRequestBodySchema,
  EnrichmentJobStatusApiResponseSchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'
import { bulkEnrich } from './bulk'
import { batchEnrichWebsites, getEnrichmentJobStatus } from './enrich'

const enrichRouter: Router = express.Router()

enrichRouter.post(
  '/batch',
  validateRequest({
    bodySchema: BatchEnrichmentRequestBodySchema,
    responseSchema: BatchEnrichmentResponseApiResponseSchema,
  }),
  batchEnrichWebsites,
)

enrichRouter.post(
  '/bulk',
  validateRequest({
    bodySchema: BulkEnrichmentRequestBodySchema,
    responseSchema: BulkEnrichmentApiResponseSchema,
  }),
  bulkEnrich,
)

enrichRouter.get(
  '/job/:jobId/status',
  validateRequest({
    responseSchema: EnrichmentJobStatusApiResponseSchema,
  }),
  getEnrichmentJobStatus,
)

export default enrichRouter
