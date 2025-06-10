import { logger } from '@ritchy/logger'
import type {
  OAuthCallbackBody,
  OAuthConnectUrlResponse,
  OAuthDisconnectResponse,
  OAuthStatusResponse,
} from '@ritchy/types'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../db/db'
import { hubspotToken } from '../../../db/schema'
import {
  exchangeCodeForToken,
  getAuthUrl,
} from '../../../external/hubspot/oauth'
import {
  clearTokenCache,
  getValidToken,
  tokenCache,
} from '../../../external/hubspot/token_manager'

const frontendBaseUrl = process.env.FRONTEND_BASE_URL

export const getConnectUrl = async (
  req: Request,
  res: Response<OAuthConnectUrlResponse>,
): Promise<void> => {
  try {
    const state = crypto.randomUUID()

    req.session.hubspotOAuthState = {
      state,
      userId: req.auth.userId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    }

    const authUrl = getAuthUrl(state)

    logger.info({
      msg: 'Generated HubSpot connection URL',
      event: 'hubspot_connect_url_generated',
      metadata: { userId: req.auth.userId, state },
    })

    res.json({ authUrl })
  } catch (error) {
    logger.error({
      msg: 'Failed to generate HubSpot connection URL',
      event: 'hubspot_connect_url_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        userId: req.auth.userId,
      },
    })
    res.status(500).json({
      error: 'Failed to generate connection URL',
      message: 'Please try again later',
    })
  }
}

export const handleCallback = async (
  req: Request<Record<string, never>, Record<string, never>, OAuthCallbackBody>,
  res: Response,
): Promise<void> => {
  const { code, state, error } = req.body

  const storedState = req.session.hubspotOAuthState
  if (
    !storedState ||
    storedState.state !== state ||
    storedState.userId !== req.auth.userId ||
    storedState.expiresAt < Date.now()
  ) {
    clearTokenCache(req.auth.userId)

    logger.error({
      msg: 'Invalid or expired state parameter',
      event: 'hubspot_oauth_state_error',
      metadata: { userId: req.auth.userId },
    })
    return res.redirect(`${frontendBaseUrl}/hubspot?error=invalid_state`)
  }

  req.session.hubspotOAuthState = undefined

  if (error) {
    logger.error({
      msg: 'HubSpot OAuth error',
      event: 'hubspot_oauth_error',
      metadata: { error, userId: req.auth.userId },
    })
    return res.redirect(`${frontendBaseUrl}/hubspot?error=oauth_failed`)
  }

  if (!code) {
    return res.redirect(`${frontendBaseUrl}/hubspot?error=no_code`)
  }

  try {
    await exchangeCodeForToken(code, req.auth.userId)
    logger.info({
      msg: 'Successfully completed HubSpot OAuth flow',
      event: 'hubspot_oauth_success',
      metadata: { userId: req.auth.userId },
    })
    res.redirect(`${frontendBaseUrl}/hubspot?success=connected`)
  } catch (error) {
    logger.error({
      msg: 'Failed to complete HubSpot OAuth flow',
      event: 'hubspot_oauth_exchange_error',
      metadata: { error, userId: req.auth.userId },
    })
    res.redirect(`${frontendBaseUrl}/hubspot?error=exchange_failed`)
  }
}

export const getStatus = async (
  req: Request,
  res: Response<OAuthStatusResponse>,
): Promise<void> => {
  try {
    const token = await getValidToken(req.auth.userId)
    if (!token) {
      logger.info({
        msg: 'No HubSpot token found',
        event: 'hubspot_status_no_token',
        metadata: { userId: req.auth.userId },
      })
      res.json({ connected: false })
      return
    }

    logger.info({
      msg: 'HubSpot token found',
      event: 'hubspot_status_token_found',
      metadata: { userId: req.auth.userId },
    })
    res.json({ connected: true })
  } catch (error) {
    logger.error({
      msg: 'Error checking HubSpot connection status',
      event: 'hubspot_status_error',
      metadata: { error, userId: req.auth.userId },
    })
    res.json({ connected: false })
  }
}

export const disconnect = async (
  req: Request,
  res: Response<OAuthDisconnectResponse>,
): Promise<void> => {
  try {
    await db
      .delete(hubspotToken)
      .where(eq(hubspotToken.userId, req.auth.userId))

    tokenCache.delete(req.auth.userId)

    logger.info({
      msg: 'Successfully disconnected HubSpot integration',
      event: 'hubspot_disconnect_success',
      metadata: { userId: req.auth.userId },
    })

    res.json({ success: true })
  } catch (error) {
    logger.error({
      msg: 'Failed to disconnect HubSpot integration',
      event: 'hubspot_disconnect_error',
      metadata: { error, userId: req.auth.userId },
    })
    res.status(500).json({
      error: 'Failed to disconnect',
      message: 'Please try again later',
    })
  }
}
