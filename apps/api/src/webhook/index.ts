import express, { type Router } from 'express'

import { clerkWebhook } from './clerk'
import { stripeWebhook } from './stripe'
import { hubspotWebhook } from './hubspot'

const webhookRoutes: Router = express.Router()

webhookRoutes.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhook,
)
webhookRoutes.post(
  '/clerk',
  express.raw({ type: 'application/json' }),
  clerkWebhook,
)
webhookRoutes.post(
  '/hubspot',
  express.raw({ type: 'application/json' }),
  hubspotWebhook,
)

export default webhookRoutes
