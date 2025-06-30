import {
  GetReviewsApiResponseSchema,
  GetReviewsParamsSchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../../middleware/zodValidation'
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
