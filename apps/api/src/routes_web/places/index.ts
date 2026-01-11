import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'

// Import contracts
import {
  AutocompleteApiResponseSchema,
  AutocompleteRequestBodySchema,
} from './autocomplete/contract'
import {
  GeocodeApiResponseSchema,
  GeocodeRequestParamsSchema,
} from './geocode/contract'
import {
  GetPlaceApiResponseSchema,
  GetPlaceRequestParamsSchema,
} from './get/contract'

// Import handlers
import { autocompleteHandler } from './autocomplete/autocomplete'
import { geocodeHandler } from './geocode/geocode'
import { getPlaceHandler } from './get/get'

// Import nested routers
import contactsRouter from './contacts'
import enrichmentRouter from './enrichment'
import notesRouter from './notes'
import reviewsRouter from './reviews'
import statusRouter from './update-status'

const placesRouter: Router = express.Router({ mergeParams: true })

// Non-parameterized routes first
placesRouter.post(
  '/autocomplete',
  validateRequest({
    bodySchema: AutocompleteRequestBodySchema,
    responseSchema: AutocompleteApiResponseSchema,
  }),
  autocompleteHandler,
)

// Specific parameterized routes before catch-all
placesRouter.get(
  '/:placeId/geocode',
  validateRequest({
    paramsSchema: GeocodeRequestParamsSchema,
    responseSchema: GeocodeApiResponseSchema,
  }),
  geocodeHandler,
)

// Nested routers with specific paths
placesRouter.use('/:userPlaceId/status', statusRouter)

placesRouter.use('/:userPlaceId/notes', notesRouter)

placesRouter.use('/:userPlaceId/reviews', reviewsRouter)

placesRouter.use('/:userPlaceId/enrichment', enrichmentRouter)

placesRouter.use('/:userPlaceId/contacts', contactsRouter)

// Catch-all route last
placesRouter.get(
  '/:userPlaceId',
  validateRequest({
    paramsSchema: GetPlaceRequestParamsSchema,
    responseSchema: GetPlaceApiResponseSchema,
  }),
  getPlaceHandler,
)

export default placesRouter
