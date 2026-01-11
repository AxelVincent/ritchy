import express, { type Router } from 'express'
import { validateRequest } from '../../../middleware/zodValidation'

// Import contracts
import {
  GetContactsApiResponseSchema,
  GetContactsParamsSchema,
} from './contract'

// Import handlers
import { getContactsHandler } from './contacts'

const contactsRouter: Router = express.Router({ mergeParams: true })

contactsRouter.get(
  '/',
  validateRequest({
    paramsSchema: GetContactsParamsSchema,
    responseSchema: GetContactsApiResponseSchema,
  }),
  getContactsHandler,
)

export default contactsRouter
