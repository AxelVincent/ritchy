import {
  CreateContactApiResponseSchema,
  CreateContactRequestSchema,
  DeleteContactApiResponseSchema,
  DeleteContactEmailApiResponseSchema,
  DeleteContactEmailRequestSchema,
  DeleteContactPhoneApiResponseSchema,
  DeleteContactPhoneRequestSchema,
  DeleteContactRequestSchema,
  PostContactEmailApiResponseSchema,
  PostContactEmailRequestSchema,
  PostContactPhoneApiResponseSchema,
  PostContactPhoneRequestSchema,
  UpdateContactApiResponseSchema,
  UpdateContactEmailApiResponseSchema,
  UpdateContactEmailRequestSchema,
  UpdateContactPhoneApiResponseSchema,
  UpdateContactPhoneRequestSchema,
  UpdateContactRequestSchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'
import { postContactEmail } from './add_contact_email'
import { postContactPhone } from './add_contact_phone'
import { createContactHandler } from './create_contact'
import { deleteContactHandler } from './delete_contact'
import { deleteContactEmailHandler } from './delete_contact_email'
import { deleteContactPhoneHandler } from './delete_contact_phone'
import { updateContactHandler } from './update_contact'
import { updateContactEmailHandler } from './update_contact_email'
import { updateContactPhoneHandler } from './update_contact_phone'

const contactsRouter: Router = express.Router()

// Email routes
contactsRouter.post(
  '/email',
  validateRequest({
    bodySchema: PostContactEmailRequestSchema,
    responseSchema: PostContactEmailApiResponseSchema,
  }),
  postContactEmail,
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
    bodySchema: PostContactPhoneRequestSchema,
    responseSchema: PostContactPhoneApiResponseSchema,
  }),
  postContactPhone,
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
