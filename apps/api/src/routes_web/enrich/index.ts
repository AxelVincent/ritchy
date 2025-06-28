import {
  BatchEnrichmentRequestBodySchema,
  BatchEnrichmentResponseApiResponseSchema,
  EnrichmentJobStatusApiResponseSchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'
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
enrichRouter.get(
  '/job/:jobId/status',
  validateRequest({
    responseSchema: EnrichmentJobStatusApiResponseSchema,
  }),
  getEnrichmentJobStatus,
)

export default enrichRouter
