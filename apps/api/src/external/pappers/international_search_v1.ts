import { logger } from '@ritchy/logger'
import { startDurationTimer } from '@ritchy/metrics'
import { ContactTypeEnum } from '@ritchy/types'
import z from 'zod'
import { PAPPERS_CONFIG } from '../../config/pappers'
import {
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'
import { PAPPERS_COUNTRY_CODES } from './international_company_v1'

const InternationalSearchRequestParamsSchema = z.object({
  api_token: z.string(),
  country_code: PAPPERS_COUNTRY_CODES,
  q: z.string(),
  page: z.number().optional(),
  per_page: z.number().optional(),
})

const InternationalSearchResponseSchema = z.object({
  results: z.array(
    z.object({
      company_number: z.string(),
      country_code: z.string(),
      type: ContactTypeEnum.nullable(),
      name: z.string(),
      legal_form_code: z.string().nullable(),
      local_legal_form_code: z.string().nullable(),
      local_legal_form_name: z.string().nullable(),
      activities: z
        .array(
          z.object({
            code: z.string().nullable(),
            name: z.string().nullable(),
          }),
        )
        .nullable(),
      local_activities: z
        .array(
          z.object({
            code: z.string().nullable(),
            name: z.string().nullable(),
            classification: z.string().nullable(),
          }),
        )
        .nullable(),
      date_of_creation: z.string().nullable(),
      status: z.string(),
      date_of_cessation: z.string().nullable(),
      head_office: z
        .object({
          address_line_1: z.string().nullable(),
          address_line_2: z.string().nullable(),
          postal_code: z.string().nullable(),
          city: z.string().nullable(),
          country: z.string().nullable(),
          country_code: z.string().nullable(),
        })
        .nullable(),
    }),
  ),
  total: z.number(),
  page: z.number(),
  hasMoreResults: z.boolean(),
})

export type InternationalSearchResponse = z.infer<
  typeof InternationalSearchResponseSchema
>

export type InternationalSearchRequestParams = z.infer<
  typeof InternationalSearchRequestParamsSchema
>

export type InterantionalSearchV1 = {
  countryCode: z.infer<typeof PAPPERS_COUNTRY_CODES>
  q: string
  page?: number
  perPage?: number
}
export const internationalSearchV1 = async ({
  countryCode,
  q,
  page = 1,
  perPage = 100,
}: InterantionalSearchV1) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)
  const metricsTimer = startDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '500'

  try {
    const url = new URL(`${PAPPERS_CONFIG.BASE_URL}/v1/search`)
    url.searchParams.set('api_token', PAPPERS_CONFIG.API_KEY)
    url.searchParams.set('country_code', countryCode)
    url.searchParams.set('q', q)
    url.searchParams.set('page', page.toString())
    url.searchParams.set('per_page', perPage.toString())

    logger.info({
      msg: 'International Search API request',
      event: 'international_search_api_request',
      metadata: {
        url: url.toString(),
        countryCode,
        q,
      },
    })

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    httpStatusCode = response.status.toString()
    const data = await response.json()
    logger.info({
      msg: 'International Search API response',
      event: 'international_search_api_response',
      metadata: {
        data,
      },
    })

    if (!response.ok || (data.statusCode && data.statusCode >= 400)) {
      logger.error({
        msg: 'International Search API returned error',
        event: 'international_search_api_error_response',
        metadata: {
          httpStatus: response.status,
          statusText: response.statusText,
          errorData: data,
          url: url.toString(),
        },
      })

      // Track error in metrics
      metricsTimer.stop({
        service: 'pappers',
        endpoint: 'international_search',
      })
      externalApiRequestsCounter.inc({
        service: 'pappers',
        endpoint: 'international_search',
        status_code: httpStatusCode,
      })

      throw new Error(
        `Pappers API error (HTTP ${response.status}${data.statusCode ? `, API ${data.statusCode}` : ''}): ${data.message || data.description || JSON.stringify(data)}`,
      )
    }

    const parsedData = InternationalSearchResponseSchema.safeParse(data)

    if (!parsedData.success) {
      logger.error({
        msg: 'International Search API response validation failed',
        event: 'international_search_api_validation_error',
        metadata: {
          validationErrors: parsedData.error.issues,
          receivedData: data,
        },
      })

      // Track validation error in metrics
      metricsTimer.stop({
        service: 'pappers',
        endpoint: 'international_search',
      })
      externalApiRequestsCounter.inc({
        service: 'pappers',
        endpoint: 'international_search',
        status_code: httpStatusCode,
      })

      throw new Error(
        `Invalid Pappers API response structure: ${JSON.stringify(parsedData.error.issues)}`,
      )
    }

    logger.info({
      msg: 'International Search API parsed successfully',
      event: 'international_search_api_parsed',
      metadata: {
        data: parsedData.data.toString().slice(0, 150),
        resultsCount: parsedData.data.results.length,
        total: parsedData.data.total,
      },
    })

    // Track successful request
    metricsTimer.stop({ service: 'pappers', endpoint: 'international_search' })
    externalApiRequestsCounter.inc({
      service: 'pappers',
      endpoint: 'international_search',
      status_code: httpStatusCode,
    })

    return parsedData.data
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      httpStatusCode = '408'
      metricsTimer.stop({
        service: 'pappers',
        endpoint: 'international_search',
      })
      externalApiRequestsCounter.inc({
        service: 'pappers',
        endpoint: 'international_search',
        status_code: httpStatusCode,
      })

      logger.error({
        msg: 'International Search API request timed out',
        event: 'international_search_api_timeout',
        metadata: { error },
      })
      throw new Error('International Search API request timed out')
    }

    if (httpStatusCode === '500') {
      metricsTimer.stop({
        service: 'pappers',
        endpoint: 'international_search',
      })
      externalApiRequestsCounter.inc({
        service: 'pappers',
        endpoint: 'international_search',
        status_code: httpStatusCode,
      })
    }

    logger.error({
      msg: 'International Search API error',
      event: 'international_search_api_error',
      metadata: { error },
    })
    throw error
  } finally {
    clearTimeout(timer)
  }
}
