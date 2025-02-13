import express, { type Router } from 'express'
import { createCheckoutSession } from './create_checkout_session'
import { createPortalSession } from './create_portal_session'

const router: Router = express.Router()

// Checkout
router.post('/create-checkout-session', createCheckoutSession)

// Portal
router.post('/create-portal-session', createPortalSession)

export default router
