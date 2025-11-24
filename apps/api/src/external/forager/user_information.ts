import { logger } from '@ritchy/logger'
import { startDurationTimer } from '@ritchy/metrics'
import { z } from 'zod'
import { FORAGER_CONFIG } from '../../config/forager'
import {
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'

// Response Schema based on Forager API documentation
// https://docs.forager.ai/openapi/users/subscriptions_balance_change_logs_list
const SubscriptionTierSchema = z.object({
  id: z.number(),
  name: z.string(),
  person_details_lookup: z.number().optional(),
  person_work_email_lookup: z.number().optional(),
  person_personal_email_lookup: z.number().optional(),
  person_phone_number_lookup: z.number().optional(),
  person_reverse_email_search: z.number().optional(),
  person_reverse_phone_number_search: z.number().optional(),
  person_role_details_lookup: z.number().optional(),
  person_role_search_api_call: z.number().optional(),
  job_search_api_call: z.number().optional(),
  organization_search_api_call: z.number().optional(),
  organization_technologies_lookup: z.number().optional(),
})

const SubscriptionSchema = z.object({
  id: z.number(),
  is_active: z.boolean().optional(),
  credits_balance: z.number(),
  subscription_tier: SubscriptionTierSchema,
  stripe_subscription_id: z.string().nullable().optional(),
})

const AccountSchema = z.object({
  id: z.number(),
  name: z.string(),
  subscription: SubscriptionSchema,
})

const UserInformationResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  accounts: z.array(AccountSchema),
})

export type UserInformationResponse = z.infer<
  typeof UserInformationResponseSchema
>

/**
 * Get current user information including credit balance
 * @returns User information with subscription details
 */
export const getUserInformation =
  async (): Promise<UserInformationResponse> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 45000)
    const metricsTimer = startDurationTimer(externalApiDurationHistogram)
    let httpStatusCode = '500'

    try {
      const url = `${FORAGER_CONFIG.BASE_URL}/users/current/`

      logger.info({
        msg: 'Forager User Information API request',
        event: 'forager_user_information_request',
        metadata: {
          url,
          accountId: FORAGER_CONFIG.ACCOUNT_ID,
        },
      })

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': FORAGER_CONFIG.API_KEY,
        },
        signal: controller.signal,
      })

      httpStatusCode = response.status.toString()
      const data = await response.json()

      // Handle error responses
      if (!response.ok) {
        logger.error({
          msg: 'Forager User Information API error response',
          event: 'forager_user_information_error_response',
          metadata: {
            status: response.status,
            data,
          },
        })

        // Track error in metrics
        metricsTimer.stop({ service: 'forager', endpoint: 'user_information' })
        externalApiRequestsCounter.inc({
          service: 'forager',
          endpoint: 'user_information',
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
        msg: 'Forager User Information API response received',
        event: 'forager_user_information_response',
        metadata: {
          status: response.status,
          hasData: !!data,
          hasAccounts: !!data.accounts,
        },
      })

      const parsedData = UserInformationResponseSchema.parse(data)

      // Find the account matching our ACCOUNT_ID
      const account = parsedData.accounts.find(
        (acc) => acc.id.toString() === FORAGER_CONFIG.ACCOUNT_ID,
      )

      if (!account) {
        logger.warn({
          msg: 'Forager account not found in user information',
          event: 'forager_account_not_found',
          metadata: {
            accountId: FORAGER_CONFIG.ACCOUNT_ID,
            availableAccountIds: parsedData.accounts.map((acc) => acc.id),
          },
        })
      }

      // Track successful request
      metricsTimer.stop({ service: 'forager', endpoint: 'user_information' })
      externalApiRequestsCounter.inc({
        service: 'forager',
        endpoint: 'user_information',
        status_code: httpStatusCode,
      })

      logger.info({
        msg: 'Forager User Information API response parsed successfully',
        event: 'forager_user_information_response_parsed',
        metadata: {
          userId: parsedData.id,
          email: parsedData.email,
          accountId: account?.id,
          creditsBalance: account?.subscription.credits_balance,
          isActive: account?.subscription.is_active,
          subscriptionTier: account?.subscription.subscription_tier.name,
        },
      })

      return parsedData
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        httpStatusCode = '408'
        metricsTimer.stop({ service: 'forager', endpoint: 'user_information' })
        externalApiRequestsCounter.inc({
          service: 'forager',
          endpoint: 'user_information',
          status_code: httpStatusCode,
        })

        logger.error({
          msg: 'Forager User Information API request timed out',
          event: 'forager_user_information_timeout',
          metadata: { error: error.message },
        })
        throw new Error('Forager User Information API request timed out')
      }

      if (error instanceof z.ZodError) {
        // Don't re-track metrics for validation errors (already tracked above if response.ok)
        logger.error({
          msg: 'Forager User Information API response validation error',
          event: 'forager_user_information_validation_error',
          metadata: {
            error: error.message,
            issues: error.issues,
          },
        })
        throw new Error(`Invalid response from Forager API: ${error.message}`)
      }

      // Track other errors if not already tracked
      if (httpStatusCode === '500') {
        metricsTimer.stop({ service: 'forager', endpoint: 'user_information' })
        externalApiRequestsCounter.inc({
          service: 'forager',
          endpoint: 'user_information',
          status_code: httpStatusCode,
        })
      }

      logger.error({
        msg: 'Forager User Information API error',
        event: 'forager_user_information_error',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
      throw error
    } finally {
      clearTimeout(timer)
    }
  }
