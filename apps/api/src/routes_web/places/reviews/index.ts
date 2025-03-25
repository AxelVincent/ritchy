import {
  GetReviewsApiResponseSchema,
  GetReviewsParamsSchema,
} from '@ritchy/types'
import { validateRequest } from 'apps/api/src/middleware/zodValidation'
import express, { type Router } from 'express'
import { getPlaceReviews } from './get'

const reviewsRouter: Router = express.Router({ mergeParams: true })

reviewsRouter.get(
  '/',
  validateRequest({
    paramsSchema: GetReviewsParamsSchema,
    responseSchema: GetReviewsApiResponseSchema,
  }),
  getPlaceReviews,
)

export default reviewsRouter
