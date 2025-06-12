import { Client } from '@hubspot/api-client'
import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import { HUBSPOT_CONFIG } from '../../config/hubspot'
import { db } from '../../db/db'
import { hubspotToken } from '../../db/schema'
import { createApiQueue } from '../utils/api_queue'
import { hubspotRateLimiter } from '../utils/rate_limiter/config'
import type { HubspotToken } from './oauth'

// Create API queue for HubSpot operations
const hubspotQueue = createApiQueue(hubspotRateLimiter, {
  maxRetries: 3,
  defaultPriority: 0,
  onError: (error) => {
    logger.error({
      msg: 'HubSpot API queue error',
      event: 'hubspot_api_queue_error',
      metadata: { error },
    })
  },
})

// Token Management Functions
const getHubspotClient = async (userId: string): Promise<Client> => {
  const token = await getValidToken(userId)
  return new Client({ accessToken: token.accessToken })
}

export const getValidToken = async (userId: string): Promise<HubspotToken> => {
  const [token] = await db
    .select()
    .from(hubspotToken)
    .where(eq(hubspotToken.userId, userId))

  if (!token) {
    throw new Error('No HubSpot token found for user')
  }

  // Check if token needs refresh
  if (
    token.expiresAt.getTime() <=
    Date.now() + HUBSPOT_CONFIG.CACHE.REFRESH_THRESHOLD
  ) {
    try {
      return await refreshToken(userId)
    } catch (error) {
      logger.error({
        msg: 'Failed to refresh token during validation',
        event: 'hubspot_token_refresh_error',
        metadata: { error, userId },
      })
      throw error
    }
  }

  return token
}

export const refreshToken = async (userId: string): Promise<HubspotToken> => {
  try {
    const [currentToken] = await db
      .select()
      .from(hubspotToken)
      .where(eq(hubspotToken.userId, userId))

    if (!currentToken) {
      throw new Error('No token found for user')
    }

    const response = await fetch(HUBSPOT_CONFIG.API.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: HUBSPOT_CONFIG.CLIENT_ID,
        client_secret: HUBSPOT_CONFIG.CLIENT_SECRET,
        refresh_token: currentToken.refreshToken,
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(
        `Failed to refresh token: ${error.message || response.statusText}`,
      )
    }

    const data = await response.json()
    const newToken = {
      ...currentToken,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      updatedAt: new Date(),
    }

    // Update database
    await db
      .update(hubspotToken)
      .set({
        accessToken: newToken.accessToken,
        refreshToken: newToken.refreshToken,
        expiresAt: newToken.expiresAt,
        updatedAt: newToken.updatedAt,
      })
      .where(eq(hubspotToken.userId, userId))

    return newToken
  } catch (error) {
    logger.error({
      msg: 'Failed to refresh HubSpot token',
      event: 'hubspot_token_refresh_error',
      metadata: {
        error,
        userId,
        config: {
          baseUrl: HUBSPOT_CONFIG.API.BASE_URL,
          tokenUrl: HUBSPOT_CONFIG.API.TOKEN_URL,
        },
      },
    })
    throw error
  }
}

// Updated API Operation Wrapper with queue integration
export const withHubspotClient = async <T>(
  userId: string,
  operation: (client: Client) => Promise<T>,
  options: {
    retries?: number
    onRetry?: (error: unknown, attempt: number) => void
    priority?: number
  } = {},
): Promise<T> => {
  const { retries = 2, onRetry, priority = 0 } = options

  return hubspotQueue.addToQueue(async () => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const client = await getHubspotClient(userId)
        return await operation(client)
      } catch (error) {
        const isAuthError =
          (error as { status?: number }).status === 401 ||
          (error as { body?: { category?: string } }).body?.category ===
            'EXPIRED_AUTHENTICATION' ||
          (error as { body?: { message?: string } }).body?.message?.includes(
            'OAuth token used to make this call expired',
          )
        const hasRetriesLeft = attempt < retries

        if (isAuthError && hasRetriesLeft) {
          try {
            await refreshToken(userId)
            onRetry?.(error, attempt + 1)
            continue
          } catch (refreshError) {
            logger.error({
              msg: 'Failed to refresh token during retry',
              event: 'hubspot_token_refresh_retry_error',
              metadata: {
                error: refreshError,
                originalError: error,
                userId,
                attempt,
              },
            })
            throw error
          }
        }

        logger.error({
          msg: 'HubSpot API operation failed',
          event: 'hubspot_api_error',
          metadata: {
            error,
            userId,
            attempt,
            isAuthError,
            hasRetriesLeft,
            config: {
              baseUrl: HUBSPOT_CONFIG.API.BASE_URL,
              scopes: HUBSPOT_CONFIG.SCOPES,
            },
          },
        })
        throw error
      }
    }

    throw new Error('Max retries exceeded')
  }, priority)
}
