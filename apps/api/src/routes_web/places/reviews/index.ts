import express, { type Router } from 'express'
import { validateRequest } from '../../../middleware/zodValidation'

// Import contracts
import { GetReviewsApiResponseSchema, GetReviewsParamsSchema } from './contract'

// Import handlers
import { getReviewsHandler } from './reviews'

const reviewsRouter: Router = express.Router({ mergeParams: true })

reviewsRouter.get(
  '/',
  validateRequest({
    paramsSchema: GetReviewsParamsSchema,
    responseSchema: GetReviewsApiResponseSchema,
  }),
  getReviewsHandler,
)

export default reviewsRouter
