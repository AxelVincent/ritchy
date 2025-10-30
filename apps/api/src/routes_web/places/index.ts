import {
  AutocompleteApiResponseSchema,
  AutocompleteRequestBodySchema,
  GeocodeApiResponseSchema,
  GeocodeRequestParamsSchema,
  GetPlaceApiResponseSchema,
  GetPlaceRequestParamsSchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'
import contactsRouter from './contacts'
import enrichmentRouter from './enrichments'
import { getGeocode } from './get_geocode'
import { getPlace } from './get_place'
import notesRouter from './notes'
import { postAutocomplete } from './post_autocomplete'
import reviewsRouter from './reviews'
import statusRouter from './status'

const placesRouter: Router = express.Router({ mergeParams: true })

// Non-parameterized routes first
placesRouter.post(
  '/autocomplete',
  validateRequest({
    bodySchema: AutocompleteRequestBodySchema,
    responseSchema: AutocompleteApiResponseSchema,
  }),
  postAutocomplete,
)

// Specific parameterized routes before catch-all
placesRouter.get(
  '/:placeId/geocode',
  validateRequest({
    paramsSchema: GeocodeRequestParamsSchema,
    responseSchema: GeocodeApiResponseSchema,
  }),
  getGeocode,
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
  getPlace,
)

export default placesRouter
