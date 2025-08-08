import { PostContactEmailApiResponseSchema } from '@ritchy/types'
import { PostContactEmailRequestSchema } from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'
import { postContactEmail } from './add_contact_email'

const contactsRouter: Router = express.Router()

contactsRouter.post(
  '/email',
  validateRequest({
    bodySchema: PostContactEmailRequestSchema,
    responseSchema: PostContactEmailApiResponseSchema,
  }),
  postContactEmail,
)

export default contactsRouter
