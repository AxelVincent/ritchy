import { logger } from '@ritchy/logger'
import { RUST_HTML_SERVICE_CONFIG } from '../../config/rust_html_service'
import type {
  ProcessHtmlRequest,
  ProcessHtmlResponse,
  ProcessHtmlResult,
} from './types'

/**
 * Process HTML content using the Rust HTML service.
 *
 * This is a drop-in replacement for the Node.js HTML processing pipeline.
 * It sends HTML to the Rust service and returns extracted data including:
 * - Markdown content for RAG indexing
 * - Contact information (emails, phones)
 * - Links (internal, social media)
 * - Technology signals (scripts, meta tags, iframes)
 *
 * @param request - The HTML processing request
 * @returns Processing result or error
 */
export const processHtmlWithRust = async (
  request: ProcessHtmlRequest,
): Promise<ProcessHtmlResult> => {
  const startTime = Date.now()
  const serviceUrl = `${RUST_HTML_SERVICE_CONFIG.URL}/process`

  logger.info({
    msg: '[Rust HTML Service] Starting request',
    event: 'rust_html_service_request_start',
    metadata: {
      serviceUrl,
      targetUrl: request.url,
      htmlSize: request.html.length,
      timeoutMs: RUST_HTML_SERVICE_CONFIG.TIMEOUT_MS,
    },
  })

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      RUST_HTML_SERVICE_CONFIG.TIMEOUT_MS,
    )

    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RUST_HTML_SERVICE_CONFIG.API_KEY}`,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    logger.info({
      msg: '[Rust HTML Service] Response received',
      event: 'rust_html_service_response_received',
      metadata: {
        serviceUrl,
        targetUrl: request.url,
        status: response.status,
        statusText: response.statusText,
        processingTimeMs: Date.now() - startTime,
      },
    })

    const result: ProcessHtmlResult = await response.json()

    if (result.success) {
      logger.info({
        msg: '[Rust HTML Service] Processing completed',
        event: 'rust_html_service_success',
        metadata: {
          url: request.url,
          processingTimeMs: Date.now() - startTime,
          rustProcessingTimeMs: result.metadata?.processingTimeMs,
          htmlSize: request.html.length,
          emailsFound: result.data.contacts.emails.length,
          phonesFound: result.data.contacts.phones.length,
          internalLinksFound: result.data.links.internal.length,
          scriptsFound: result.data.scripts.length,
        },
      })
    } else {
      logger.warn({
        msg: '[Rust HTML Service] Processing returned error',
        event: 'rust_html_service_error_response',
        metadata: {
          url: request.url,
          processingTimeMs: Date.now() - startTime,
          error: result.error,
        },
      })
    }

    return result
  } catch (error) {
    const isAbortError = error instanceof Error && error.name === 'AbortError'
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : 'Unknown'
    const errorWithCause = error as Error & { cause?: unknown }
    const errorCause = errorWithCause.cause
      ? JSON.stringify(
          errorWithCause.cause,
          Object.getOwnPropertyNames(errorWithCause.cause as object),
        )
      : undefined

    const displayError = isAbortError
      ? `Request timed out after ${RUST_HTML_SERVICE_CONFIG.TIMEOUT_MS}ms`
      : errorMessage

    logger.error({
      msg: '[Rust HTML Service] Request failed',
      event: 'rust_html_service_request_failed',
      metadata: {
        serviceUrl,
        targetUrl: request.url,
        error: displayError,
        errorName,
        errorCause,
        processingTimeMs: Date.now() - startTime,
        configuredTimeoutMs: RUST_HTML_SERVICE_CONFIG.TIMEOUT_MS,
      },
    })

    return {
      success: false,
      error: {
        code: 'RUST_SERVICE_ERROR',
        message: displayError,
      },
    }
  }
}

/**
 * Check if the Rust HTML service is healthy
 */
export const checkRustServiceHealth = async (): Promise<boolean> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${RUST_HTML_SERVICE_CONFIG.URL}/health`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.status === 'healthy'
  } catch {
    return false
  }
}
