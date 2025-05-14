import express, { type Router } from 'express'
import { z } from 'zod'
import { HubspotOAuthConfigSchema, createHubspotOAuthService } from '../external/hubspot/oauth'
import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import { db } from '../db/db'
import { hubspotToken } from '../db/schema'

const hubspotRouter: Router = express.Router()

// Validate environment variables
const config = HubspotOAuthConfigSchema.parse({
  CLIENT_ID: process.env.HUBSPOT_CLIENT_ID,
  CLIENT_SECRET: process.env.HUBSPOT_CLIENT_SECRET,
  SCOPES: process.env.HUBSPOT_SCOPES?.split(/ |, ?|%20/) ?? ['crm.objects.contacts.read'],
  REDIRECT_URI: new URL(`${process.env.FRONTEND_BASE_URL}/hubspot/callback`).toString(),
})

const oauthService = createHubspotOAuthService(config)

// Update the redirect URLs to use FRONTEND_BASE_URL
const frontendBaseUrl = process.env.FRONTEND_BASE_URL

// Get connection URL
hubspotRouter.get('/connect-url', (req, res) => {
  try {
    const state = crypto.randomUUID()
    
    // Store state in session for verification
    req.session.hubspotOAuthState = {
      state,
      userId: req.auth.userId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    }

    // Pass state parameter to getAuthUrl
    const authUrl = oauthService.getAuthUrl(state)
    
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
      metadata: { error: error instanceof Error ? error.message : String(error), userId: req.auth.userId },
    })
    res.status(500).json({ 
      error: 'Failed to generate connection URL',
      message: 'Please try again later'
    })
  }
})

// OAuth callback - this is called by HubSpot
hubspotRouter.post('/callback', async (req, res) => {
  const { code, state, error } = z
    .object({
      code: z.string().optional(),
      state: z.string(),
      error: z.string().optional(),
    })
    .parse(req.body)

  // Verify state parameter
  const storedState = req.session.hubspotOAuthState
  if (!storedState || 
      storedState.state !== state || 
      storedState.userId !== req.auth.userId ||
      storedState.expiresAt < Date.now()) {
    logger.error({
      msg: 'Invalid or expired state parameter',
      event: 'hubspot_oauth_state_error',
      metadata: { userId: req.auth.userId },
    })
    return res.redirect(`${frontendBaseUrl}/hubspot?error=invalid_state`)
  }

  // Clear the state from session
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
    await oauthService.exchangeCodeForToken(code, req.auth.userId)
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
})

// Get HubSpot token status
hubspotRouter.get('/status', async (req, res) => {
  try {
    const token = await oauthService.getValidToken(req.auth.userId)
    res.json({ connected: true, token })
  } catch (error) {
    logger.error({
      msg: 'Failed to get HubSpot token status',
      event: 'hubspot_status_error',
      metadata: { error, userId: req.auth.userId },
    })
    res.json({ connected: false })
  }
})

// Add disconnect endpoint
hubspotRouter.post('/disconnect', async (req, res) => {
  try {
    // Delete the token from the database
    await db.delete(hubspotToken).where(eq(hubspotToken.userId, req.auth.userId))
    
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
      message: 'Please try again later'
    })
  }
})

export default hubspotRouter