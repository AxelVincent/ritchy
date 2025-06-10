import {
  OAuthCallbackBodySchema,
  OAuthConnectUrlResponseSchema,
  OAuthDisconnectResponseSchema,
  OAuthStatusResponseSchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../../middleware/zodValidation'
import { disconnect, getConnectUrl, getStatus, handleCallback } from './oauth'

const oauthRouter: Router = express.Router()

oauthRouter.get(
  '/connect-url',
  validateRequest({
    responseSchema: OAuthConnectUrlResponseSchema,
  }),
  getConnectUrl,
)

oauthRouter.post(
  '/callback',
  validateRequest({
    bodySchema: OAuthCallbackBodySchema,
  }),
  handleCallback,
)

oauthRouter.get(
  '/status',
  validateRequest({
    responseSchema: OAuthStatusResponseSchema,
  }),
  getStatus,
)

oauthRouter.post(
  '/disconnect',
  validateRequest({
    responseSchema: OAuthDisconnectResponseSchema,
  }),
  disconnect,
)

export default oauthRouter
