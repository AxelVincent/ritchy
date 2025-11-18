import { logger } from '@ritchy/logger'
import z from 'zod'
import { ICYPEAS_CONFIG } from '../../config/icypeas'

// Request Schema
const SubscriptionInformationRequestBodySchema = z.object({
  email: z.string().email(),
})

export type SubscriptionInformationRequestBody = z.infer<
  typeof SubscriptionInformationRequestBodySchema
>

// Response Schema
// Based on actual API response structure
const SubscriptionInformationResponseSchema = z.object({
  userId: z.string(),
  customerId: z.string(),
  currency: z.string(),
  checkoutSession: z.union([z.string().url(), z.literal('')]).optional(),
  lastInvoiceUrl: z.string(),
  priceId: z.string(),
  plan: z.string(),
  status: z.string(),
  credits: z.number(),
  quotas: z.object({
    daily: z.number(),
  }),
})

export type SubscriptionInformationResponse = z.infer<
  typeof SubscriptionInformationResponseSchema
>

export type SubscriptionInformationParams = {
  email: string
}

export const getSubscriptionInformation = async ({
  email,
}: SubscriptionInformationParams): Promise<SubscriptionInformationResponse> => {
  // Validate input parameters
  const validatedBody = SubscriptionInformationRequestBodySchema.parse({
    email,
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)

  try {
    const url = `${ICYPEAS_CONFIG.BASE_URL}/a/actions/subscription-information`

    logger.info({
      msg: 'Icypeas Subscription Information API request',
      event: 'icypeas_subscription_information_request',
      metadata: {
        url,
        email: validatedBody.email,
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

    const data = await response.json()

    // Handle error responses (401, 429, validation errors)
    if (!response.ok) {
      logger.error({
        msg: 'Icypeas Subscription Information API error response',
        event: 'icypeas_subscription_information_error_response',
        metadata: {
          status: response.status,
          data,
          email: validatedBody.email,
        },
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
      msg: 'Icypeas Subscription Information API response received',
      event: 'icypeas_subscription_information_response',
      metadata: {
        status: response.status,
        data,
        hasData: !!data,
        hasUserId: !!data.userId,
      },
    })

    const parsedData = SubscriptionInformationResponseSchema.parse(data)

    logger.info({
      msg: 'Icypeas Subscription Information API response parsed successfully',
      event: 'icypeas_subscription_information_response_parsed',
      metadata: {
        userId: parsedData.userId,
        plan: parsedData.plan,
        status: parsedData.status,
        credits: parsedData.credits,
        dailyQuota: parsedData.quotas.daily,
      },
    })

    return parsedData
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error({
        msg: 'Icypeas Subscription Information API request timed out',
        event: 'icypeas_subscription_information_timeout',
        metadata: { error: error.message },
      })
      throw new Error('Icypeas Subscription Information API request timed out')
    }

    if (error instanceof z.ZodError) {
      logger.error({
        msg: 'Icypeas Subscription Information API response validation error',
        event: 'icypeas_subscription_information_validation_error',
        metadata: {
          error: error.message,
          issues: error.issues,
          email,
        },
      })
      throw new Error(`Invalid response from Icypeas API: ${error.message}`)
    }

    logger.error({
      msg: 'Icypeas Subscription Information API error',
      event: 'icypeas_subscription_information_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        email,
      },
    })
    throw error
  } finally {
    clearTimeout(timer)
  }
}
