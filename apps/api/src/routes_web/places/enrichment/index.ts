import {
  GetPlacesEnrichmentApiResponseSchema,
  GetPlacesEnrichmentParamsSchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../../middleware/zodValidation'
import { getPlacesEnrichment } from './get'

const enrichmentRouter: Router = express.Router({ mergeParams: true })

enrichmentRouter.get(
  '/',
  validateRequest({
    paramsSchema: GetPlacesEnrichmentParamsSchema,
    responseSchema: GetPlacesEnrichmentApiResponseSchema,
  }),
  getPlacesEnrichment,
)

export default enrichmentRouter
