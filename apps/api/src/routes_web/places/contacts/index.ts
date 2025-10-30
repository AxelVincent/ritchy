import {
  GetPlacesContactsApiResponseSchema,
  GetPlacesContactsParamsSchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../../middleware/zodValidation'
import { getPlacesContacts } from './get'

const contactsRouter: Router = express.Router({ mergeParams: true })

contactsRouter.get(
  '/',
  validateRequest({
    paramsSchema: GetPlacesContactsParamsSchema,
    responseSchema: GetPlacesContactsApiResponseSchema,
  }),
  getPlacesContacts,
)

export default contactsRouter
