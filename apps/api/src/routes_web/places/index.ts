import {
  AutocompleteApiResponseSchema,
  AutocompleteRequestBodySchema,
  PostGetPlacesApiResponseSchema,
  PostGetPlacesRequestSchema,
} from '@ritchy/types'
import {
  GeocodeApiResponseSchema,
  GeocodeRequestParamsSchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'
import { getGeocode } from './get_geocode'
import notesRouter from './notes'
import { postAutocomplete } from './post_autocomplete'
import { postGetPlaces } from './post_get_places'
import reviewsRouter from './reviews'
import statusRouter from './status'

const placesRouter: Router = express.Router({ mergeParams: true })

placesRouter.use('/:placeId/status', statusRouter)

placesRouter.use('/:placeId/notes', notesRouter)

placesRouter.use('/:placeId/reviews', reviewsRouter)

placesRouter.post(
  '/',
  validateRequest({
    bodySchema: PostGetPlacesRequestSchema,
    responseSchema: PostGetPlacesApiResponseSchema,
  }),
  postGetPlaces,
)

placesRouter.post(
  '/autocomplete',
  validateRequest({
    bodySchema: AutocompleteRequestBodySchema,
    responseSchema: AutocompleteApiResponseSchema,
  }),
  postAutocomplete,
)

placesRouter.get(
  '/:placeId/geocode',
  validateRequest({
    paramsSchema: GeocodeRequestParamsSchema,
    responseSchema: GeocodeApiResponseSchema,
  }),
  getGeocode,
)

export default placesRouter
