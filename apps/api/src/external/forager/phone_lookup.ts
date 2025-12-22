import { logger } from '@ritchy/logger'

import { z } from 'zod'
import { FORAGER_CONFIG } from '../../config/forager'
import {
  createSimpleDurationTimer,
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'

// Request Schema
const PhoneLookupRequestSchema = z.object({
  person_id: z.number().int().nonnegative().optional(), // Make it optional
  linkedin_public_identifier: z.string().min(1),
})

export type PhoneLookupRequest = z.infer<typeof PhoneLookupRequestSchema>

// Response Schema
const PhoneNumberSchema = z.object({
  phone_number: z.string(),
})

const PhoneLookupResponseSchema = z.array(PhoneNumberSchema)

export type PhoneLookupResponse = z.infer<typeof PhoneLookupResponseSchema>
export type PhoneNumber = z.infer<typeof PhoneNumberSchema>

export type PhoneLookupParams = {
  personId?: number
  linkedinPublicIdentifier: string
}

/**
 * Lookup phone numbers for a person using Forager API
 * @param params - The lookup parameters
 * @returns Array of phone numbers
 */
export const lookupPhoneNumbers = async ({
  personId,
  linkedinPublicIdentifier,
}: PhoneLookupParams): Promise<PhoneLookupResponse> => {
  // Validate input parameters - use 0 as default if personId is not provided
  const validatedBody = PhoneLookupRequestSchema.parse({
    person_id: personId ?? 0, // Provide default value
    linkedin_public_identifier: linkedinPublicIdentifier,
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)
  const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '500'

  try {
    const url = `${FORAGER_CONFIG.BASE_URL}/${FORAGER_CONFIG.ACCOUNT_ID}/datastorage/person_contacts_lookup/phone_numbers/`

    logger.info({
      msg: 'Forager Phone Lookup API request',
      event: 'forager_phone_lookup_request',
      metadata: {
        url,
        personId: validatedBody.person_id,
        linkedinPublicIdentifier: validatedBody.linkedin_public_identifier,
      },
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': FORAGER_CONFIG.API_KEY,
      },
      body: JSON.stringify(validatedBody),
      signal: controller.signal,
    })

    httpStatusCode = response.status.toString()
    const data = await response.json()

    // Handle error responses
    if (!response.ok) {
      logger.error({
        msg: 'Forager Phone Lookup API error response',
        event: 'forager_phone_lookup_error_response',
        metadata: {
          status: response.status,
          data,
          personId: validatedBody.person_id,
          linkedinPublicIdentifier: validatedBody.linkedin_public_identifier,
        },
      })

      // Track error in metrics
      metricsTimer.stop({ service: 'forager', endpoint: 'phone_lookup' })
      externalApiRequestsCounter.inc({
        service: 'forager',
        endpoint: 'phone_lookup',
        status_code: httpStatusCode,
      })

      // Handle specific error types
      if (response.status === 401) {
        throw new Error('Forager API authentication failed')
      }
      if (response.status === 429) {
        throw new Error('Forager API rate limit exceeded')
      }

      throw new Error(
        `Forager API error! status: ${response.status}, message: ${
          data.message || data.error || 'Unknown error'
        }`,
      )
    }

    logger.info({
      msg: 'Forager Phone Lookup API response received',
      event: 'forager_phone_lookup_response',
      metadata: {
        status: response.status,
        phoneNumbersCount: Array.isArray(data) ? data.length : 0,
      },
    })

    const parsedData = PhoneLookupResponseSchema.parse(data)

    // Track successful request
    metricsTimer.stop({ service: 'forager', endpoint: 'phone_lookup' })
    externalApiRequestsCounter.inc({
      service: 'forager',
      endpoint: 'phone_lookup',
      status_code: httpStatusCode,
    })

    logger.info({
      msg: 'Forager Phone Lookup API response parsed successfully',
      event: 'forager_phone_lookup_response_parsed',
      metadata: {
        phoneNumbersCount: parsedData.length,
        personId: validatedBody.person_id,
      },
    })

    return parsedData
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      httpStatusCode = '408'
      metricsTimer.stop({ service: 'forager', endpoint: 'phone_lookup' })
      externalApiRequestsCounter.inc({
        service: 'forager',
        endpoint: 'phone_lookup',
        status_code: httpStatusCode,
      })

      logger.error({
        msg: 'Forager Phone Lookup API request timed out',
        event: 'forager_phone_lookup_timeout',
        metadata: { error: error.message },
      })
      throw new Error('Forager Phone Lookup API request timed out')
    }

    if (error instanceof z.ZodError) {
      // Don't re-track metrics for validation errors (already tracked above if response.ok)
      logger.error({
        msg: 'Forager Phone Lookup API response validation error',
        event: 'forager_phone_lookup_validation_error',
        metadata: {
          error: error.message,
          issues: error.issues,
          personId,
          linkedinPublicIdentifier,
        },
      })
      throw new Error(`Invalid response from Forager API: ${error.message}`)
    }

    // Track other errors if not already tracked
    if (httpStatusCode === '500') {
      metricsTimer.stop({ service: 'forager', endpoint: 'phone_lookup' })
      externalApiRequestsCounter.inc({
        service: 'forager',
        endpoint: 'phone_lookup',
        status_code: httpStatusCode,
      })
    }

    logger.error({
      msg: 'Forager Phone Lookup API error',
      event: 'forager_phone_lookup_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        personId,
        linkedinPublicIdentifier,
      },
    })
    throw error
  } finally {
    clearTimeout(timer)
  }
}
