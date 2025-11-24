import { logger } from '@ritchy/logger'
import { startDurationTimer } from '@ritchy/metrics'
import { BRIGHTDATA_CONFIG } from '../../config/brightdata'
import {
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'

import { UnrecoverableError } from 'bullmq'
import { z } from 'zod'

const BrightdataWebUnlockerResponseSchema = z.object({
  status_code: z.number(),
  success: z.boolean(),
  error: z.string().optional(),
  headers: z
    .object({
      'access-control-allow-origin': z.string().optional(),
      'cache-control': z.string().optional(),
      'content-type': z.string().optional(),
      date: z.string().optional(),
      expires: z.string().optional(),
      link: z.string().optional(),
      'referrer-policy': z.string().optional(),
      server: z.string().optional(),
      'strict-transport-security': z.string().optional(),
      vary: z.string().optional(),
      'x-content-type-options': z.string().optional(),
      'x-frame-options': z.string().optional(),
      'x-powered-by': z.string().optional(),
      'x-xss-protection': z.string().optional(),
      connection: z.string().optional(),
      'transfer-encoding': z.string().optional(),
    })
    .catchall(z.string()),
  body: z.string(),
})

export type BrightdataWebUnlockerResponse = z.infer<
  typeof BrightdataWebUnlockerResponseSchema
>

export const webUnblocker = async (
  url: string,
): Promise<BrightdataWebUnlockerResponse> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)
  const metricsTimer = startDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '500'

  try {
    const body = {
      zone: 'web_unlocker1',
      url,
      format: 'json',
    }
    logger.info({
      msg: '[Brightdata] Unblocking website',
      event: 'brightdata_unblock_start',
      metadata: { url, body },
    })
    const response = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${BRIGHTDATA_CONFIG.API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    // Capture HTTP status code
    httpStatusCode = response.status.toString()

    const data = await response.json()

    // Track successful request
    metricsTimer.stop({ service: 'brightdata', endpoint: 'web_unlocker' })
    externalApiRequestsCounter.inc({
      service: 'brightdata',
      endpoint: 'web_unlocker',
      status_code: httpStatusCode,
    })

    logger.info({
      msg: '[Brightdata] Website unblocked',
      event: 'brightdata_success',
      metadata: { url },
    })
    return data
  } catch (error) {
    // Track failed request
    if (error instanceof Error && error.name === 'AbortError') {
      httpStatusCode = '408' // Request Timeout
      logger.error({
        msg: '[Brightdata] Request timed out',
        event: 'brightdata_timeout',
        metadata: { url },
      })

      metricsTimer.stop({ service: 'brightdata', endpoint: 'web_unlocker' })
      externalApiRequestsCounter.inc({
        service: 'brightdata',
        endpoint: 'web_unlocker',
        status_code: httpStatusCode,
      })

      throw new UnrecoverableError('Timeout')
    }

    // Track other errors
    metricsTimer.stop({ service: 'brightdata', endpoint: 'web_unlocker' })
    externalApiRequestsCounter.inc({
      service: 'brightdata',
      endpoint: 'web_unlocker',
      status_code: httpStatusCode,
    })

    logger.error({
      msg: '[Brightdata] Error unblocking website',
      event: 'brightdata_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  } finally {
    clearTimeout(timer)
  }
}
