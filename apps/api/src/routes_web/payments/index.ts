import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'

// Import contracts
import {
  CreateCheckoutSessionApiResponseSchema,
  CreateCheckoutSessionRequestSchema,
} from './create-checkout-session/contract'
import { CreatePortalSessionApiResponseSchema } from './create-portal-session/contract'

// Import handlers
import { createCheckoutSessionHandler } from './create-checkout-session/create-checkout-session'
import { createPortalSessionHandler } from './create-portal-session/create-portal-session'

const paymentsRouter: Router = express.Router()

// Checkout
paymentsRouter.post(
  '/create-checkout-session',
  validateRequest({
    bodySchema: CreateCheckoutSessionRequestSchema,
    responseSchema: CreateCheckoutSessionApiResponseSchema,
  }),
  createCheckoutSessionHandler,
)

// Portal
paymentsRouter.post(
  '/create-portal-session',
  validateRequest({
    responseSchema: CreatePortalSessionApiResponseSchema,
  }),
  createPortalSessionHandler,
)

export default paymentsRouter
