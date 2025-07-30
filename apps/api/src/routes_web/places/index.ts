import {
  AutocompleteApiResponseSchema,
  AutocompleteRequestBodySchema,
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
import reviewsRouter from './reviews'
import statusRouter from './status'

const placesRouter: Router = express.Router({ mergeParams: true })

placesRouter.use('/:userPlaceId/status', statusRouter)

placesRouter.use('/:userPlaceId/notes', notesRouter)

placesRouter.use('/:placeSourceId/reviews', reviewsRouter)

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
