import { randomUUID } from 'node:crypto'
import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import type { ApiAuthRequest } from '../../../middleware/api_key_auth'
import { insertApiUsage } from '../../../services/api_keys'
import { companyEnrichmentService } from '../../../services/enrichment/company/service'
import { COMPANY_CREDITS } from '../../../services/enrichment/shared/config/constants'
import {
  INSUFFICIENT_CREDITS_ERROR,
  USER_CREDITS_NOT_FOUND_ERROR,
} from '../../../services/payment/queries/consume_credits'
import { getUserCredits } from '../../../services/payment/queries/get_user_credits'
import { EnrichCompanyRequestSchema } from './contract'
import type {
  ApiV1CompanyEnrichmentSuccessResponse,
  ApiV1ErrorResponse,
} from './contract'
import { buildApiV1CompanyEnrichmentData } from './utils/build_api_v1_response'
import { createUserPlaceForApi } from './utils/create_user_place'
import { resolveGooglePlaceId } from './utils/resolve_place_id'

/**
 * Generate a unique request ID for tracking and debugging
 */
const generateRequestId = (): string => {
  return `req_${randomUUID().replace(/-/g, '').slice(0, 24)}`
}

/**
 * Track API usage in the database
 */
const trackApiUsage = async (
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  creditsUsed: number,
  latencyMs?: number,
  ipAddress?: string,
  userAgent?: string,
  requestBody?: unknown,
  responseBody?: unknown,
): Promise<void> => {
  try {
    await insertApiUsage({
      apiKeyId,
      endpoint,
      method,
      statusCode,
      creditsUsed,
      latencyMs,
      ipAddress,
      userAgent,
      requestBody,
      responseBody,
    })
  } catch (error) {
    // Don't fail the request if usage tracking fails
    logger.error({
      msg: 'Failed to track API usage',
      event: 'api_usage_tracking_error',
      metadata: { apiKeyId, endpoint, error },
    })
  }
}

/**
 * POST /api/v1/enrich/company
 *
 * Enriches a company from a Google Place ID or Google Maps URL.
 * Returns full company enrichment data synchronously.
 */
export const enrichCompanyHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const startTime = Date.now()
  const requestId = generateRequestId()
  const { userId, apiKeyId } = (req as ApiAuthRequest).apiAuth
  const ipAddress = req.metadata?.ipAddress
  const userAgent = req.metadata?.userAgent

  try {
    // 1. Validate request
    const parseResult = EnrichCompanyRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      const latencyMs = Date.now() - startTime
      const errorResponse: ApiV1ErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        },
        meta: {
          requestId,
          processingTimeMs: latencyMs,
        },
      }
      await trackApiUsage(
        apiKeyId,
        '/v1/enrich/company',
        'POST',
        400,
        0,
        latencyMs,
        ipAddress,
        userAgent,
        req.body,
        errorResponse,
      )
      res.status(400).json(errorResponse)
      return
    }

    // 2. Resolve Google Place ID
    const resolveResult = await resolveGooglePlaceId(parseResult.data)
    if (!resolveResult.placeId) {
      const latencyMs = Date.now() - startTime
      const errorResponse: ApiV1ErrorResponse = {
        success: false,
        error: {
          code: 'PLACE_NOT_FOUND',
          message:
            resolveResult.error ||
            'Could not find a Google Place matching the input',
        },
        meta: {
          requestId,
          processingTimeMs: latencyMs,
        },
      }
      await trackApiUsage(
        apiKeyId,
        '/v1/enrich/company',
        'POST',
        404,
        0,
        latencyMs,
        ipAddress,
        userAgent,
        parseResult.data,
        errorResponse,
      )
      res.status(404).json(errorResponse)
      return
    }

    // 3. Create userPlace record (or find existing)
    const { userPlaceId, enrichmentId, placeDbId } =
      await createUserPlaceForApi(userId, resolveResult.placeId)

    // 4. Run enrichment synchronously
    const result = await companyEnrichmentService({
      userPlaceId,
      enrichmentId,
      placeId: placeDbId,
      userId,
    })

    // 5. Build API V1 response data
    const apiData = await buildApiV1CompanyEnrichmentData(userPlaceId)

    if (!apiData) {
      const latencyMs = Date.now() - startTime
      const errorResponse: ApiV1ErrorResponse = {
        success: false,
        error: {
          code: 'DATA_NOT_FOUND',
          message: 'Enrichment completed but data could not be retrieved',
        },
        meta: {
          requestId,
          processingTimeMs: latencyMs,
        },
      }
      await trackApiUsage(
        apiKeyId,
        '/v1/enrich/company',
        'POST',
        500,
        0,
        latencyMs,
        ipAddress,
        userAgent,
        parseResult.data,
        errorResponse,
      )
      res.status(500).json(errorResponse)
      return
    }

    // 6. Track usage and return response
    const latencyMs = Date.now() - startTime
    const creditsUsed = result.alreadyEnriched ? 0 : COMPANY_CREDITS

    // Get credits remaining for response
    const creditsRemaining = await getUserCredits(userId)

    const successResponse: ApiV1CompanyEnrichmentSuccessResponse = {
      success: true,
      data: apiData,
      meta: {
        requestId,
        processingTimeMs: latencyMs,
        creditsUsed,
        creditsRemaining,
      },
    }

    await trackApiUsage(
      apiKeyId,
      '/v1/enrich/company',
      'POST',
      200,
      creditsUsed,
      latencyMs,
      ipAddress,
      userAgent,
      parseResult.data,
      successResponse,
    )

    res.json(successResponse)
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    const requestData = EnrichCompanyRequestSchema.safeParse(req.body).data

    // Handle credit-specific errors from companyEnrichmentService
    if (
      errorMessage === INSUFFICIENT_CREDITS_ERROR ||
      errorMessage === USER_CREDITS_NOT_FOUND_ERROR
    ) {
      const errorResponse: ApiV1ErrorResponse = {
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Not enough credits. Please upgrade your plan.',
        },
        meta: {
          requestId,
          processingTimeMs: latencyMs,
        },
      }
      await trackApiUsage(
        apiKeyId,
        '/v1/enrich/company',
        'POST',
        402,
        0,
        latencyMs,
        ipAddress,
        userAgent,
        requestData,
        errorResponse,
      )
      res.status(402).json(errorResponse)
      return
    }

    const errorResponse: ApiV1ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Enrichment failed. Please try again.',
      },
      meta: {
        requestId,
        processingTimeMs: latencyMs,
      },
    }

    await trackApiUsage(
      apiKeyId,
      '/v1/enrich/company',
      'POST',
      500,
      0,
      latencyMs,
      ipAddress,
      userAgent,
      requestData,
      errorResponse,
    )

    logger.error({
      msg: 'API enrichment failed',
      event: 'api_enrich_company_error',
      metadata: { userId, apiKeyId, requestId, error: errorMessage },
    })

    res.status(500).json(errorResponse)
  }
}
