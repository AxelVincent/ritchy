import { createTokenBucket } from './rate_limiter'

/**
 * Pre-configured rate limiter for Google Places API
 * Limits requests to 600 per minute as per Google Places API requirements
 * Both capacity and refill rate are set to 600/minute (10/second)
 * Note: Google's quota resets every minute, while this provides a rolling window
 */
export const googlePlacesRateLimiter = createTokenBucket(600 / 60, 600)

/**
 * Pre-configured rate limiter for HubSpot API
 * Limits requests to 110 per 10 seconds as per HubSpot OAuth app requirements
 * Both capacity and refill rate are set to 11/second (110/10)
 * Note: This is a per-account limit for OAuth apps, excluding Search API
 * The rate limiter provides a rolling window implementation
 */
export const hubspotRateLimiter = createTokenBucket(11, 110)
