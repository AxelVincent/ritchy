import express, { type Router } from 'express'
import { validateRequest } from '../../../middleware/zodValidation'

// Import contracts
import {
  UpdateStatusApiResponseSchema,
  UpdateStatusBodySchema,
  UpdateStatusParamsSchema,
} from './contract'

// Import handlers
import { updateStatusHandler } from './update-status'

const statusRouter: Router = express.Router({ mergeParams: true })

statusRouter.put(
  '/',
  validateRequest({
    paramsSchema: UpdateStatusParamsSchema,
    bodySchema: UpdateStatusBodySchema,
    responseSchema: UpdateStatusApiResponseSchema,
  }),
  updateStatusHandler,
)

export default statusRouter
