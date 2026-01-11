import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'

// Import contracts
import {
  AddContactEmailApiResponseSchema,
  AddContactEmailRequestSchema,
} from './add-email/contract'
import {
  AddContactPhoneApiResponseSchema,
  AddContactPhoneRequestSchema,
} from './add-phone/contract'
import {
  CreateContactApiResponseSchema,
  CreateContactRequestSchema,
} from './create/contract'
import {
  DeleteContactEmailApiResponseSchema,
  DeleteContactEmailRequestSchema,
} from './delete-email/contract'
import {
  DeleteContactPhoneApiResponseSchema,
  DeleteContactPhoneRequestSchema,
} from './delete-phone/contract'
import {
  DeleteContactApiResponseSchema,
  DeleteContactRequestSchema,
} from './delete/contract'
import {
  UpdateContactEmailApiResponseSchema,
  UpdateContactEmailRequestSchema,
} from './update-email/contract'
import {
  UpdateContactPhoneApiResponseSchema,
  UpdateContactPhoneRequestSchema,
} from './update-phone/contract'
import {
  UpdateContactApiResponseSchema,
  UpdateContactRequestSchema,
} from './update/contract'

// Import handlers
import { addContactEmailHandler } from './add-email/add-email'
import { addContactPhoneHandler } from './add-phone/add-phone'
import { createContactHandler } from './create/create'
import { deleteContactEmailHandler } from './delete-email/delete-email'
import { deleteContactPhoneHandler } from './delete-phone/delete-phone'
import { deleteContactHandler } from './delete/delete'
import { updateContactEmailHandler } from './update-email/update-email'
import { updateContactPhoneHandler } from './update-phone/update-phone'
import { updateContactHandler } from './update/update'

const contactsRouter: Router = express.Router()

// Email routes
contactsRouter.post(
  '/email',
  validateRequest({
    bodySchema: AddContactEmailRequestSchema,
    responseSchema: AddContactEmailApiResponseSchema,
  }),
  addContactEmailHandler,
)

contactsRouter.patch(
  '/email/:emailId',
  validateRequest({
    bodySchema: UpdateContactEmailRequestSchema,
    responseSchema: UpdateContactEmailApiResponseSchema,
  }),
  updateContactEmailHandler,
)

contactsRouter.delete(
  '/email/:emailId',
  validateRequest({
    bodySchema: DeleteContactEmailRequestSchema,
    responseSchema: DeleteContactEmailApiResponseSchema,
  }),
  deleteContactEmailHandler,
)

// Phone routes
contactsRouter.post(
  '/phone',
  validateRequest({
    bodySchema: AddContactPhoneRequestSchema,
    responseSchema: AddContactPhoneApiResponseSchema,
  }),
  addContactPhoneHandler,
)

contactsRouter.patch(
  '/phone/:phoneId',
  validateRequest({
    bodySchema: UpdateContactPhoneRequestSchema,
    responseSchema: UpdateContactPhoneApiResponseSchema,
  }),
  updateContactPhoneHandler,
)

contactsRouter.delete(
  '/phone/:phoneId',
  validateRequest({
    bodySchema: DeleteContactPhoneRequestSchema,
    responseSchema: DeleteContactPhoneApiResponseSchema,
  }),
  deleteContactPhoneHandler,
)

// Contact routes
contactsRouter.post(
  '/',
  validateRequest({
    bodySchema: CreateContactRequestSchema,
    responseSchema: CreateContactApiResponseSchema,
  }),
  createContactHandler,
)

contactsRouter.patch(
  '/:contactId',
  validateRequest({
    bodySchema: UpdateContactRequestSchema,
    responseSchema: UpdateContactApiResponseSchema,
  }),
  updateContactHandler,
)

contactsRouter.delete(
  '/:contactId',
  validateRequest({
    bodySchema: DeleteContactRequestSchema,
    responseSchema: DeleteContactApiResponseSchema,
  }),
  deleteContactHandler,
)

export default contactsRouter
