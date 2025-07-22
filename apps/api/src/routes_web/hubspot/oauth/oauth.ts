import { logger } from '@ritchy/logger'
import type {
  OAuthCallbackBody,
  OAuthConnectUrlResponse,
  OAuthDisconnectResponse,
  OAuthStatusResponse
} from '@ritchy/types'
import { and, eq, gt, sql } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../db/db'
import { hubspotToken } from '../../../db/schema'
import {
  exchangeCodeForToken,
  getAuthUrl
} from '../../../external/hubspot/oauth'
import {
  createCustomHubspotProperties,
  deleteCustomHubspotProperties
} from '../../../external/hubspot/properties'
import { getValidToken } from '../../../external/hubspot/token_manager'

const frontendBaseUrl = process.env.FRONTEND_BASE_URL

export const getConnectUrl = async (
  req: Request,
  res: Response<OAuthConnectUrlResponse>
): Promise<void> => {
  try {
    // First check if there's a valid token
    const existingToken = await getValidToken(req.auth.userId)
    if (existingToken) {
      // If there's a valid token, return an error
      logger.info({
        msg: 'Attempted to get connect URL while already connected',
        event: 'hubspot_connect_url_already_connected',
        metadata: { userId: req.auth.userId }
      })
      res.status(400).json({
        error: 'Already connected',
        message: 'Please disconnect before connecting again'
      })
      return
    }

    const state = crypto.randomUUID()
    const sessionId = req.auth.sessionId

    if (!sessionId) {
      throw new Error('No session ID available')
    }

    const values = {
      accessToken: `oauth_state:${state}`,
      refreshToken: sessionId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }

    // Now we can safely upsert since we know there's no valid token
    await db
      .insert(hubspotToken)
      .values({
        userId: req.auth.userId,
        ...values
      })
      .onConflictDoUpdate({
        target: hubspotToken.userId,
        set: {
          ...values
        }
      })

    const authUrl = getAuthUrl(state)

    logger.info({
      msg: 'Generated HubSpot connection URL',
      event: 'hubspot_connect_url_generated',
      metadata: { userId: req.auth.userId, state, authUrl }
    })

    res.json({ authUrl })
  } catch (error) {
    logger.error({
      msg: 'Failed to generate HubSpot connection URL',
      event: 'hubspot_connect_url_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        userId: req.auth.userId
      }
    })
    res.status(500).json({
      error: 'Failed to generate connection URL',
      message: 'Please try again later'
    })
  }
}

export const handleCallback = async (
  req: Request<Record<string, never>, Record<string, never>, OAuthCallbackBody>,
  res: Response
): Promise<void> => {
  const { code, state, error } = req.body
  const sessionId = req.auth.sessionId

  if (!sessionId) {
    logger.error({
      msg: 'No session ID available',
      event: 'hubspot_oauth_session_error',
      metadata: { userId: req.auth.userId }
    })
    return res.redirect(`${frontendBaseUrl}/hubspot?error=no_session`)
  }

  const [storedState] = await db
    .select()
    .from(hubspotToken)
    .where(
      and(
        eq(hubspotToken.userId, req.auth.userId),
        eq(hubspotToken.refreshToken, sessionId),
        sql`${hubspotToken.accessToken} LIKE 'oauth_state:%'`,
        gt(hubspotToken.expiresAt, new Date())
      )
    )

  if (!storedState || storedState.accessToken !== `oauth_state:${state}`) {
    logger.error({
      msg: 'Invalid or expired state parameter',
      event: 'hubspot_oauth_state_error',
      metadata: { userId: req.auth.userId }
    })
    return res.redirect(`${frontendBaseUrl}/hubspot?error=invalid_state`)
  }

  await db.delete(hubspotToken).where(eq(hubspotToken.id, storedState.id))

  if (error) {
    logger.error({
      msg: 'HubSpot OAuth error',
      event: 'hubspot_oauth_error',
      metadata: { error, userId: req.auth.userId }
    })
    return res.redirect(`${frontendBaseUrl}/hubspot?error=oauth_failed`)
  }

  if (!code) {
    return res.redirect(`${frontendBaseUrl}/hubspot?error=no_code`)
  }

  try {
    await exchangeCodeForToken(code, req.auth.userId)

    // Create HubSpot client and property after successful token exchange
    await createCustomHubspotProperties(req.auth.userId)

    logger.info({
      msg: 'Successfully completed HubSpot OAuth flow and created property',
      event: 'hubspot_oauth_success',
      metadata: { userId: req.auth.userId }
    })
    res.redirect(`${frontendBaseUrl}/hubspot?success=connected`)
  } catch (error) {
    logger.error({
      msg: 'Failed to complete HubSpot OAuth flow',
      event: 'hubspot_oauth_exchange_error',
      metadata: { error, userId: req.auth.userId }
    })
    res.redirect(`${frontendBaseUrl}/hubspot?error=exchange_failed`)
  }
}

export const getStatus = async (
  req: Request,
  res: Response<OAuthStatusResponse>
): Promise<void> => {
  try {
    const token = await getValidToken(req.auth.userId)
    if (!token) {
      logger.info({
        msg: 'No HubSpot token found',
        event: 'hubspot_status_no_token',
        metadata: { userId: req.auth.userId }
      })
      res.json({ connected: false })
      return
    }

    logger.info({
      msg: 'HubSpot token found',
      event: 'hubspot_status_token_found',
      metadata: { userId: req.auth.userId }
    })
    res.json({ connected: true })
  } catch (error) {
    logger.error({
      msg: 'Error checking HubSpot connection status',
      event: 'hubspot_status_error',
      metadata: { error, userId: req.auth.userId }
    })
    res.json({ connected: false })
  }
}

export const disconnect = async (
  req: Request,
  res: Response<OAuthDisconnectResponse>
): Promise<void> => {
  try {
    // Delete property before removing token
    await deleteCustomHubspotProperties(req.auth.userId)

    await db
      .delete(hubspotToken)
      .where(eq(hubspotToken.userId, req.auth.userId))

    logger.info({
      msg: 'Successfully disconnected HubSpot integration and removed property',
      event: 'hubspot_disconnect_success',
      metadata: { userId: req.auth.userId }
    })

    res.json({ success: true })
  } catch (error) {
    logger.error({
      msg: 'Failed to disconnect HubSpot integration',
      event: 'hubspot_disconnect_error',
      metadata: { error, userId: req.auth.userId }
    })
    res.status(500).json({
      error: 'Failed to disconnect',
      message: 'Please try again later'
    })
  }
}
