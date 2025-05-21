import { logger } from '@ritchy/logger'
import type { EnrichResponse } from '@ritchy/types'
import { WEBSITE_ANALYZER_CONFIG } from '../../config/website_analyzer'
import { mapWebsiteAnalyzerResult } from '../../services/enrichment/mapWebsiteAnalyzerResult'
import type {
  WebsiteAnalyzerRequestParams,
  WebsiteAnalyzerResult,
} from './types'

export async function analyzeWebsite(
  params: WebsiteAnalyzerRequestParams,
): Promise<EnrichResponse> {
  const startTime = Date.now()

  // Validate URL
  if (!params.url) {
    throw new Error('URL is required')
  }

  try {
    if (!WEBSITE_ANALYZER_CONFIG.API_KEY) {
      throw new Error('Website analyzer API key is not configured')
    }

    const url = new URL(`${WEBSITE_ANALYZER_CONFIG.ANALYZER_URL}/analyze`)

    logger.debug({
      msg: 'Website analyzer API request',
      event: 'website_analyzer_request',
      metadata: {
        url: url.toString(),
        targetUrl: params.url,
      },
    })

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WEBSITE_ANALYZER_CONFIG.API_KEY,
      },
      body: JSON.stringify({ url: params.url }),
    })

    if (!response.ok) {
      const responseBody = await response.text()
      let errorData: { error: string }
      try {
        errorData = JSON.parse(responseBody)
      } catch {
        errorData = { error: responseBody }
      }

      logger.error({
        msg: 'Website Analyzer API Error',
        event: 'website_analyzer_error',
        metadata: {
          errorData,
          analyzerUrl: WEBSITE_ANALYZER_CONFIG.ANALYZER_URL,
          url: params.url,
          statusCode: response.status,
          durationMs: Date.now() - startTime,
          responseBody,
        },
      })
      throw new Error(
        `Website analyzer API error: ${response.status} - ${errorData.error || 'Unknown error'}`,
      )
    }

    const data = (await response.json()) as WebsiteAnalyzerResult

    if (!data) {
      throw new Error('No results found')
    }

    logger.info({
      msg: 'Website Analyzer API Success',
      event: 'website_analyzer_success',
      metadata: {
        url: params.url,
        durationMs: Date.now() - startTime,
      },
    })

    return mapWebsiteAnalyzerResult(data)
  } catch (error) {
    logger.error({
      msg: 'Website analysis failed',
      event: 'website_analyzer_error',
      metadata: {
        analyzerUrl: WEBSITE_ANALYZER_CONFIG.ANALYZER_URL,
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : error,
        url: params.url,
      },
    })
    throw error
  }
}
