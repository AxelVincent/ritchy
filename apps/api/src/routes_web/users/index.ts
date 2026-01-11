import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'

// Import contracts
import { UserMeApiResponseSchema } from './get-me/contract'

// Import handlers
import { getMeHandler } from './get-me/get-me'

const usersRouter: Router = express.Router()

usersRouter.get(
  '/me',
  validateRequest({
    responseSchema: UserMeApiResponseSchema,
  }),
  getMeHandler,
)

export default usersRouter
