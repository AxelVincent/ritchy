import { logger } from '@ritchy/logger'
import { z } from 'zod'
import { db } from '../../db/db'
import { hubspotToken } from '../../db/schema'
import { eq } from 'drizzle-orm'

// Schemas
export const HubspotOAuthConfigSchema = z.object({
  CLIENT_ID: z.string().min(1),
  CLIENT_SECRET: z.string().min(1),
  SCOPES: z.array(z.string()).default(['crm.objects.contacts.read']),
  REDIRECT_URI: z.string().url(),
})

export const HubspotTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  user: z.string().optional(),
})

// Types
export type HubspotOAuthConfig = z.infer<typeof HubspotOAuthConfigSchema>
export type HubspotToken = z.infer<typeof HubspotTokenSchema>

export interface HubspotTokenStore {
  refreshToken: string
  accessToken: string
  expiresAt: number
  userId: string
}

// Helper functions
const createAuthUrl = (config: HubspotOAuthConfig, state: string): string => {
  const params = new URLSearchParams({
    client_id: config.CLIENT_ID,
    scope: config.SCOPES.join(' '),
    redirect_uri: config.REDIRECT_URI,
    state,
  })

  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`
}

const exchangeCodeForToken = async (
  config: HubspotOAuthConfig,
  code: string,
  userId: string,
): Promise<HubspotTokenStore> => {
  try {
    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.CLIENT_ID,
        client_secret: config.CLIENT_SECRET,
        redirect_uri: config.REDIRECT_URI,
        code,
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to exchange code: ${error.message || response.statusText}`)
    }

    const data = await response.json()
    const token = HubspotTokenSchema.parse(data)

    // Store token in database
    await db.insert(hubspotToken).values({
      userId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
    })

    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      userId,
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to exchange HubSpot OAuth code',
      event: 'hubspot_oauth_exchange_error',
      metadata: { error, userId },
    })
    throw error
  }
}

const refreshToken = async (
  config: HubspotOAuthConfig,
  userId: string,
): Promise<HubspotTokenStore> => {
  try {
    const [token] = await db
      .select()
      .from(hubspotToken)
      .where(eq(hubspotToken.userId, userId))

    if (!token) {
      throw new Error('No token found for user')
    }

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.CLIENT_ID,
        client_secret: config.CLIENT_SECRET,
        refresh_token: token.refreshToken,
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to refresh token: ${error.message || response.statusText}`)
    }

    const data = await response.json()
    const newToken = HubspotTokenSchema.parse(data)

    // Update token in database
    await db
      .update(hubspotToken)
      .set({
        accessToken: newToken.access_token,
        refreshToken: newToken.refresh_token,
        expiresAt: new Date(Date.now() + newToken.expires_in * 1000),
      })
      .where(eq(hubspotToken.userId, userId))

    return {
      accessToken: newToken.access_token,
      refreshToken: newToken.refresh_token,
      expiresAt: Date.now() + newToken.expires_in * 1000,
      userId,
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to refresh HubSpot token',
      event: 'hubspot_token_refresh_error',
      metadata: { error, userId },
    })
    throw error
  }
}

const getValidToken = async (
  config: HubspotOAuthConfig,
  userId: string,
): Promise<string> => {
  const [token] = await db
    .select()
    .from(hubspotToken)
    .where(eq(hubspotToken.userId, userId))

  if (!token) {
    throw new Error('No HubSpot token found for user')
  }

  // If token expires in less than 5 minutes, refresh it
  if (token.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const newToken = await refreshToken(config, userId)
    return newToken.accessToken
  }

  return token.accessToken
}

// Export a factory function to create the OAuth service
export const createHubspotOAuthService = (config: HubspotOAuthConfig) => ({
  getAuthUrl: (state: string) => createAuthUrl(config, state),
  exchangeCodeForToken: (code: string, userId: string) =>
    exchangeCodeForToken(config, code, userId),
  refreshToken: (userId: string) => refreshToken(config, userId),
  getValidToken: (userId: string) => getValidToken(config, userId),
})

// Export type for the service
export type HubspotOAuthService = ReturnType<typeof createHubspotOAuthService> 