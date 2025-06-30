import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'
import { z } from 'zod'
import { HUBSPOT_CONFIG } from '../../config/hubspot'
import { db } from '../../db/db'
import { hubspotToken } from '../../db/schema'
import { createAllHubspotFieldMappings } from '../../services/hubspot/utils/create_all_hubspot_field_mappings'

// Types
export type HubspotToken = InferSelectModel<typeof hubspotToken>

// Helper functions
export const getAuthUrl = (state: string): string => {
  const params = new URLSearchParams({
    client_id: HUBSPOT_CONFIG.CLIENT_ID,
    scope: HUBSPOT_CONFIG.SCOPES.join(' '),
    redirect_uri: HUBSPOT_CONFIG.REDIRECT_URI,
    state,
  })

  return `${HUBSPOT_CONFIG.API.AUTH_URL}?${params.toString()}`
}

export const exchangeCodeForToken = async (
  code: string,
  userId: string,
): Promise<HubspotToken> => {
  try {
    const response = await fetch(HUBSPOT_CONFIG.API.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: HUBSPOT_CONFIG.CLIENT_ID,
        client_secret: HUBSPOT_CONFIG.CLIENT_SECRET,
        redirect_uri: HUBSPOT_CONFIG.REDIRECT_URI,
        code,
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(
        `Failed to exchange code: ${error.message || response.statusText}`,
      )
    }

    const data = await response.json()
    const mappedToken = {
      id: data.id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      userId,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }

    // Use upsert instead of insert and capture the returned token
    const [insertedToken] = await db
      .insert(hubspotToken)
      .values({
        userId,
        accessToken: mappedToken.accessToken,
        refreshToken: mappedToken.refreshToken,
        expiresAt: mappedToken.expiresAt,
      })
      .onConflictDoUpdate({
        target: hubspotToken.userId,
        set: {
          accessToken: mappedToken.accessToken,
          refreshToken: mappedToken.refreshToken,
          expiresAt: mappedToken.expiresAt,
          updatedAt: new Date(),
        },
      })
      .returning()

    // Create all field mappings using the actual token ID
    await createAllHubspotFieldMappings(insertedToken.id)

    return mappedToken
  } catch (error) {
    logger.error({
      msg: 'Failed to exchange HubSpot OAuth code',
      event: 'hubspot_oauth_exchange_error',
      metadata: {
        error,
        userId,
        config: {
          tokenUrl: HUBSPOT_CONFIG.API.TOKEN_URL,
          redirectUri: HUBSPOT_CONFIG.REDIRECT_URI,
        },
      },
    })
    throw error
  }
}
