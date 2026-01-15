import { randomUUID } from 'node:crypto'
import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import type { ApiAuthRequest } from '../../../middleware/api_key_auth'
import { insertApiUsage } from '../../../services/api_keys'
import {
  type StreamCallback,
  companyEnrichmentService,
} from '../../../services/enrichment/company/service'
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
 * SSE Event Types for streaming enrichment
 */
export type StreamEventType = 'progress' | 'discovery' | 'complete' | 'error'

export interface StreamProgressEvent {
  event: 'progress'
  step: string
  progress: number
  timestamp: number
}

export interface StreamDiscoveryEvent {
  event: 'discovery'
  field: string
  value: unknown
  timestamp: number
}

export interface StreamCompleteEvent {
  event: 'complete'
  data: Awaited<ReturnType<typeof buildApiV1CompanyEnrichmentData>>
  meta: {
    requestId: string
    processingTimeMs: number
    creditsUsed: number
    creditsRemaining: number
  }
}

export interface StreamErrorEvent {
  event: 'error'
  code: string
  message: string
  meta: {
    requestId: string
    processingTimeMs: number
  }
}

export type StreamEvent =
  | StreamProgressEvent
  | StreamDiscoveryEvent
  | StreamCompleteEvent
  | StreamErrorEvent

/**
 * Send an SSE event to the client
 */
const sendSSEEvent = (res: Response, event: StreamEvent): void => {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

/**
 * Send the [DONE] signal and end the stream
 */
const endSSEStream = (res: Response): void => {
  res.write('data: [DONE]\n\n')
  res.end()
}

/**
 * POST /api/v1/enrich/company
 *
 * Enriches a company from a Google Place ID or Google Maps URL.
 *
 * Query parameters:
 * - stream=true: Enable SSE streaming mode with progress updates
 *
 * Without streaming: Returns full company enrichment data synchronously as JSON.
 * With streaming: Returns SSE stream with progress updates and discoveries,
 * followed by the complete enrichment data.
 */
export const enrichCompanyHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const isStreaming = req.query.stream === 'true'

  if (isStreaming) {
    return handleStreamingRequest(req, res)
  }
  return handleSyncRequest(req, res)
}

/**
 * Handle synchronous (non-streaming) enrichment request
 */
const handleSyncRequest = async (
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

/**
 * Handle streaming enrichment request with SSE
 */
const handleStreamingRequest = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const startTime = Date.now()
  const requestId = generateRequestId()
  const { userId, apiKeyId } = (req as ApiAuthRequest).apiAuth
  const ipAddress = req.metadata?.ipAddress
  const userAgent = req.metadata?.userAgent

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering
  res.flushHeaders()

  // Track if client disconnected
  let clientDisconnected = false
  req.on('close', () => {
    clientDisconnected = true
    logger.info({
      msg: 'SSE client disconnected',
      event: 'sse_client_disconnected',
      metadata: { requestId },
    })
  })

  try {
    // 1. Validate request
    const parseResult = EnrichCompanyRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      const latencyMs = Date.now() - startTime
      sendSSEEvent(res, {
        event: 'error',
        code: 'INVALID_REQUEST',
        message: 'Invalid request body',
        meta: { requestId, processingTimeMs: latencyMs },
      })
      endSSEStream(res)

      await insertApiUsage({
        apiKeyId,
        endpoint: '/v1/enrich/company',
        method: 'POST',
        statusCode: 400,
        creditsUsed: 0,
        latencyMs,
        ipAddress,
        userAgent,
        requestBody: req.body,
        responseBody: { error: 'INVALID_REQUEST' },
      })
      return
    }

    // Send initial progress
    sendSSEEvent(res, {
      event: 'progress',
      step: 'Resolving Google Place',
      progress: 2,
      timestamp: Date.now(),
    })

    // 2. Resolve Google Place ID
    const resolveResult = await resolveGooglePlaceId(parseResult.data)
    if (!resolveResult.placeId) {
      const latencyMs = Date.now() - startTime
      sendSSEEvent(res, {
        event: 'error',
        code: 'PLACE_NOT_FOUND',
        message:
          resolveResult.error ||
          'Could not find a Google Place matching the input',
        meta: { requestId, processingTimeMs: latencyMs },
      })
      endSSEStream(res)

      await insertApiUsage({
        apiKeyId,
        endpoint: '/v1/enrich/company',
        method: 'POST',
        statusCode: 404,
        creditsUsed: 0,
        latencyMs,
        ipAddress,
        userAgent,
        requestBody: parseResult.data,
        responseBody: { error: 'PLACE_NOT_FOUND' },
      })
      return
    }

    sendSSEEvent(res, {
      event: 'progress',
      step: 'Preparing enrichment',
      progress: 4,
      timestamp: Date.now(),
    })

    // 3. Create userPlace record (or find existing)
    const { userPlaceId, enrichmentId, placeDbId } =
      await createUserPlaceForApi(userId, resolveResult.placeId)

    // 4. Run enrichment with streaming callbacks
    const streamCallback: StreamCallback = (event) => {
      if (!clientDisconnected) {
        try {
          sendSSEEvent(res, event)
        } catch (_error) {
          // If write fails, client likely disconnected
          clientDisconnected = true
          logger.debug({
            msg: 'Failed to send SSE event, client may have disconnected',
            event: 'sse_write_error',
            metadata: { requestId },
          })
        }
      }
    }

    const result = await companyEnrichmentService({
      userPlaceId,
      enrichmentId,
      placeId: placeDbId,
      userId,
      onProgress: streamCallback,
    })

    if (clientDisconnected) {
      logger.info({
        msg: 'Enrichment completed but client disconnected',
        event: 'enrichment_completed_client_gone',
        metadata: { requestId, userPlaceId },
      })
      // Ensure stream is properly closed even on disconnect
      try {
        res.end()
      } catch {
        // Ignore errors closing already-closed stream
      }
      return
    }

    // 5. Build API V1 response data
    const apiData = await buildApiV1CompanyEnrichmentData(userPlaceId)

    if (!apiData) {
      const latencyMs = Date.now() - startTime
      sendSSEEvent(res, {
        event: 'error',
        code: 'DATA_NOT_FOUND',
        message: 'Enrichment completed but data could not be retrieved',
        meta: { requestId, processingTimeMs: latencyMs },
      })
      endSSEStream(res)

      await insertApiUsage({
        apiKeyId,
        endpoint: '/v1/enrich/company',
        method: 'POST',
        statusCode: 500,
        creditsUsed: 0,
        latencyMs,
        ipAddress,
        userAgent,
        requestBody: parseResult.data,
        responseBody: { error: 'DATA_NOT_FOUND' },
      })
      return
    }

    // 6. Send complete event with full data
    const latencyMs = Date.now() - startTime
    const creditsUsed = result.alreadyEnriched ? 0 : COMPANY_CREDITS
    const creditsRemaining = await getUserCredits(userId)

    sendSSEEvent(res, {
      event: 'complete',
      data: apiData,
      meta: {
        requestId,
        processingTimeMs: latencyMs,
        creditsUsed,
        creditsRemaining,
      },
    })
    endSSEStream(res)

    // Track API usage
    await insertApiUsage({
      apiKeyId,
      endpoint: '/v1/enrich/company',
      method: 'POST',
      statusCode: 200,
      creditsUsed,
      latencyMs,
      ipAddress,
      userAgent,
      requestBody: parseResult.data,
      responseBody: { success: true },
    })
  } catch (error) {
    if (clientDisconnected) return

    const latencyMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    const requestData = EnrichCompanyRequestSchema.safeParse(req.body).data

    // Handle credit-specific errors
    if (
      errorMessage === INSUFFICIENT_CREDITS_ERROR ||
      errorMessage === USER_CREDITS_NOT_FOUND_ERROR
    ) {
      sendSSEEvent(res, {
        event: 'error',
        code: 'INSUFFICIENT_CREDITS',
        message: 'Not enough credits. Please upgrade your plan.',
        meta: { requestId, processingTimeMs: latencyMs },
      })
      endSSEStream(res)

      await insertApiUsage({
        apiKeyId,
        endpoint: '/v1/enrich/company',
        method: 'POST',
        statusCode: 402,
        creditsUsed: 0,
        latencyMs,
        ipAddress,
        userAgent,
        requestBody: requestData,
        responseBody: { error: 'INSUFFICIENT_CREDITS' },
      })
      return
    }

    sendSSEEvent(res, {
      event: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Enrichment failed. Please try again.',
      meta: { requestId, processingTimeMs: latencyMs },
    })
    endSSEStream(res)

    await insertApiUsage({
      apiKeyId,
      endpoint: '/v1/enrich/company',
      method: 'POST',
      statusCode: 500,
      creditsUsed: 0,
      latencyMs,
      ipAddress,
      userAgent,
      requestBody: requestData,
      responseBody: { error: 'INTERNAL_ERROR' },
    })

    logger.error({
      msg: 'API streaming enrichment failed',
      event: 'api_enrich_company_stream_error',
      metadata: { userId, apiKeyId, requestId, error: errorMessage },
    })
  }
}
