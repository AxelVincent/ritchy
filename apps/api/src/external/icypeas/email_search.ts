import { logger } from '@ritchy/logger'

import z from 'zod'
import { ICYPEAS_CONFIG } from '../../config/icypeas'
import {
  createSimpleDurationTimer,
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'

// Custom webhook/tracking object
const CustomObjectSchema = z
  .object({
    webhookUrl: z.string().url().optional(),
    externalId: z.string().optional(),
  })
  .optional()

// Request Schema
const EmailSearchRequestBodySchema = z
  .object({
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    domainOrCompany: z.string(),
    custom: CustomObjectSchema,
  })
  .refine((data) => data.firstname || data.lastname, {
    message: 'At least one of firstname or lastname must be provided',
  })

export type EmailSearchRequestBody = z.infer<
  typeof EmailSearchRequestBodySchema
>

// Response Schemas
const EmailCertaintyEnum = z.enum([
  'very_sure',
  'ultra_sure',
  'probable',
  'undeliverable',
  'not_found',
])

const EmailResultSchema = z.object({
  certainty: EmailCertaintyEnum,
  email: z.string(),
  mxProvider: z.string().nullable(),
  mxRecords: z.array(z.string()),
})

export type EmailResult = z.infer<typeof EmailResultSchema>

const EmailStatusEnum = z.enum(['FOUND', 'NOT_FOUND'])

const EmailSearchResponseSchema = z.object({
  success: z.boolean(),
  status: EmailStatusEnum,
  emails: z.array(EmailResultSchema),
  searchId: z.string(),
})

export type EmailSearchResponse = z.infer<typeof EmailSearchResponseSchema>

// // Error Response Schema (for validation errors, unauthorized, rate limit, etc.)
// const EmailSearchErrorResponseSchema = z.object({
//   success: z.literal(false),
//   error: z.string().optional(),
//   message: z.string().optional(),
//   errors: z.array(z.any()).optional(), // Validation errors array
// })

export type EmailSearchParams = {
  firstname: string
  lastname: string
  domainOrCompany: string
}

export const emailSearch = async ({
  firstname,
  lastname,
  domainOrCompany,
}: EmailSearchParams): Promise<EmailSearchResponse> => {
  // Validate input parameters
  const validatedBody = EmailSearchRequestBodySchema.parse({
    firstname,
    lastname,
    domainOrCompany,
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)
  const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '500'

  try {
    const url = `${ICYPEAS_CONFIG.SYNC_BASE_URL}/email-search`

    logger.info({
      msg: 'Icypeas Email Search API request',
      event: 'icypeas_email_search_request',
      metadata: {
        url,
        firstname: validatedBody.firstname,
        lastname: validatedBody.lastname,
        domainOrCompany: validatedBody.domainOrCompany,
      },
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ICYPEAS_CONFIG.API_KEY,
      },
      body: JSON.stringify(validatedBody),
      signal: controller.signal,
    })

    httpStatusCode = response.status.toString()
    const data = await response.json()

    // Handle error responses (401, 429, validation errors)
    if (!response.ok) {
      logger.error({
        msg: 'Icypeas Email Search API error response',
        event: 'icypeas_email_search_error_response',
        metadata: {
          status: response.status,
          data,
          firstname: validatedBody.firstname,
          lastname: validatedBody.lastname,
          domainOrCompany: validatedBody.domainOrCompany,
        },
      })

      // Track error in metrics
      metricsTimer.stop({ service: 'icypeas', endpoint: 'email_search' })
      externalApiRequestsCounter.inc({
        service: 'icypeas',
        endpoint: 'email_search',
        status_code: httpStatusCode,
      })

      // Handle specific error types
      if (response.status === 401) {
        throw new Error('Icypeas API authentication failed')
      }
      if (response.status === 429) {
        throw new Error('Icypeas API rate limit exceeded')
      }

      throw new Error(
        `Icypeas API error! status: ${response.status}, message: ${
          data.error || data.message || 'Unknown error'
        }`,
      )
    }

    logger.info({
      msg: 'Icypeas Email Search API response received',
      event: 'icypeas_email_search_response',
      metadata: {
        status: response.status,
        hasData: !!data,
        searchStatus: data.status,
      },
    })

    const parsedData = EmailSearchResponseSchema.parse(data)

    // Track successful request
    metricsTimer.stop({ service: 'icypeas', endpoint: 'email_search' })
    externalApiRequestsCounter.inc({
      service: 'icypeas',
      endpoint: 'email_search',
      status_code: httpStatusCode,
    })

    logger.info({
      msg: 'Icypeas Email Search API response parsed successfully',
      event: 'icypeas_email_search_response_parsed',
      metadata: {
        status: parsedData.status,
        emailsFound: parsedData.emails.length,
        searchId: parsedData.searchId,
      },
    })

    return parsedData
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      httpStatusCode = '408'
      metricsTimer.stop({ service: 'icypeas', endpoint: 'email_search' })
      externalApiRequestsCounter.inc({
        service: 'icypeas',
        endpoint: 'email_search',
        status_code: httpStatusCode,
      })

      logger.error({
        msg: 'Icypeas Email Search API request timed out',
        event: 'icypeas_email_search_timeout',
        metadata: { error: error.message },
      })
      throw new Error('Icypeas Email Search API request timed out')
    }

    if (error instanceof z.ZodError) {
      // Don't re-track metrics for validation errors (already tracked above if response.ok)
      logger.error({
        msg: 'Icypeas Email Search API response validation error',
        event: 'icypeas_email_search_validation_error',
        metadata: {
          error: error.message,
          issues: error.issues,
          firstname,
          lastname,
          domainOrCompany,
        },
      })
      throw new Error(`Invalid response from Icypeas API: ${error.message}`)
    }

    // Track other errors if not already tracked
    if (httpStatusCode === '500') {
      metricsTimer.stop({ service: 'icypeas', endpoint: 'email_search' })
      externalApiRequestsCounter.inc({
        service: 'icypeas',
        endpoint: 'email_search',
        status_code: httpStatusCode,
      })
    }

    logger.error({
      msg: 'Icypeas Email Search API error',
      event: 'icypeas_email_search_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        firstname,
        lastname,
        domainOrCompany,
      },
    })
    throw error
  } finally {
    clearTimeout(timer)
  }
}
