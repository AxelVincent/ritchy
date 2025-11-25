import { logger } from '@ritchy/logger'
import { startDurationTimer } from '@ritchy/metrics'
import z from 'zod'
import { ICYPEAS_CONFIG } from '../../config/icypeas'
import {
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'

// Request Schema
const ProfileUrlSearchRequestBodySchema = z
  .object({
    firstname: z.string(),
    lastname: z.string(),
    companyOrDomain: z.string().optional(),
    jobTitle: z.string().optional(),
  })
  .refine((data) => data.companyOrDomain || data.jobTitle, {
    message: 'At least one of companyOrDomain or jobTitle must be provided',
  })

export type ProfileUrlSearchRequestBody = z.infer<
  typeof ProfileUrlSearchRequestBodySchema
>

// Response Schemas
const ProfileUrlResultSchema = z.object({
  url: z.string(),
  platform: z.string(),
})

export type ProfileUrlResult = z.infer<typeof ProfileUrlResultSchema>

const ProfileUrlStatusEnum = z.enum(['FOUND', 'NOT_FOUND'])

const ProfileUrlSearchResponseSchema = z.object({
  success: z.boolean(),
  status: ProfileUrlStatusEnum,
  urls: z.array(ProfileUrlResultSchema).optional().default([]),
  searchId: z.string(),
})

export type ProfileUrlSearchResponse = z.infer<
  typeof ProfileUrlSearchResponseSchema
>

export type ProfileUrlSearchParams = {
  firstname: string
  lastname: string
  companyOrDomain?: string
  jobTitle?: string
}

export const profileUrlSearch = async ({
  firstname,
  lastname,
  companyOrDomain,
  jobTitle,
}: ProfileUrlSearchParams): Promise<ProfileUrlSearchResponse> => {
  // Validate input parameters
  const validatedBody = ProfileUrlSearchRequestBodySchema.parse({
    firstname,
    lastname,
    companyOrDomain,
    jobTitle,
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)
  const metricsTimer = startDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '500'

  try {
    const url = `${ICYPEAS_CONFIG.BASE_URL}/url-search/profile`

    logger.info({
      msg: 'Icypeas Profile URL Search API request',
      event: 'icypeas_profile_url_search_request',
      metadata: {
        url,
        firstname: validatedBody.firstname,
        lastname: validatedBody.lastname,
        companyOrDomain: validatedBody.companyOrDomain,
        jobTitle: validatedBody.jobTitle,
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
        msg: 'Icypeas Profile URL Search API error response',
        event: 'icypeas_profile_url_search_error_response',
        metadata: {
          status: response.status,
          data,
          firstname: validatedBody.firstname,
          lastname: validatedBody.lastname,
          companyOrDomain: validatedBody.companyOrDomain,
          jobTitle: validatedBody.jobTitle,
        },
      })

      // Track error in metrics
      metricsTimer.stop({ service: 'icypeas', endpoint: 'profile_url_search' })
      externalApiRequestsCounter.inc({
        service: 'icypeas',
        endpoint: 'profile_url_search',
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
      msg: 'Icypeas Profile URL Search API response received',
      event: 'icypeas_profile_url_search_response',
      metadata: {
        status: response.status,
        hasData: !!data,
        searchStatus: data.status,
      },
    })

    const parsedData = ProfileUrlSearchResponseSchema.parse(data)

    // Track successful request
    metricsTimer.stop({ service: 'icypeas', endpoint: 'profile_url_search' })
    externalApiRequestsCounter.inc({
      service: 'icypeas',
      endpoint: 'profile_url_search',
      status_code: httpStatusCode,
    })

    logger.info({
      msg: 'Icypeas Profile URL Search API response parsed successfully',
      event: 'icypeas_profile_url_search_response_parsed',
      metadata: {
        status: parsedData.status,
        urlsFound: parsedData.urls.length,
        searchId: parsedData.searchId,
      },
    })

    return parsedData
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      httpStatusCode = '408'
      metricsTimer.stop({ service: 'icypeas', endpoint: 'profile_url_search' })
      externalApiRequestsCounter.inc({
        service: 'icypeas',
        endpoint: 'profile_url_search',
        status_code: httpStatusCode,
      })

      logger.error({
        msg: 'Icypeas Profile URL Search API request timed out',
        event: 'icypeas_profile_url_search_timeout',
        metadata: { error: error.message },
      })
      throw new Error('Icypeas Profile URL Search API request timed out')
    }

    if (error instanceof z.ZodError) {
      // Don't re-track metrics for validation errors (already tracked above if response.ok)
      logger.error({
        msg: 'Icypeas Profile URL Search API response validation error',
        event: 'icypeas_profile_url_search_validation_error',
        metadata: {
          error: error.message,
          issues: error.issues,
          firstname,
          lastname,
          companyOrDomain,
          jobTitle,
        },
      })
      throw new Error(`Invalid response from Icypeas API: ${error.message}`)
    }

    // Track other errors if not already tracked
    if (httpStatusCode === '500') {
      metricsTimer.stop({ service: 'icypeas', endpoint: 'profile_url_search' })
      externalApiRequestsCounter.inc({
        service: 'icypeas',
        endpoint: 'profile_url_search',
        status_code: httpStatusCode,
      })
    }

    logger.error({
      msg: 'Icypeas Profile URL Search API error',
      event: 'icypeas_profile_url_search_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        firstname,
        lastname,
        companyOrDomain,
        jobTitle,
      },
    })
    throw error
  } finally {
    clearTimeout(timer)
  }
}
