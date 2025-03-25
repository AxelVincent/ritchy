import {
  StatusParamsSchema,
  UpdateStatusApiResponseSchema,
  UpdateStatusBodySchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../../middleware/zodValidation'
import { updateStatus } from './update'

const statusRouter: Router = express.Router({ mergeParams: true })

statusRouter.put(
  '/',
  validateRequest({
    paramsSchema: StatusParamsSchema,
    bodySchema: UpdateStatusBodySchema,
    responseSchema: UpdateStatusApiResponseSchema,
  }),
  updateStatus,
)

export default statusRouter
