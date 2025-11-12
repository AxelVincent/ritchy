import { logger } from '@ritchy/logger'
import { ICYPEAS_CONFIG } from '../../../../config/icypeas'
import { sendSlackNotification } from '../../../../external/slack/slack'
import { enqueueIcypeasSubscriptionInformationJob } from './subscription_information/queue'

const CREDIT_THRESHOLD = 10 // Minimum credits required to proceed
const LOW_CREDIT_THRESHOLD = 500 // Threshold for low credit warning

/**
 * Checks if Icypeas has sufficient credits before making API calls
 * @throws Error if credits are insufficient
 */
export const checkIcypeasCredits = async (): Promise<void> => {
  try {
    const subscriptionInfo = await enqueueIcypeasSubscriptionInformationJob({
      email: ICYPEAS_CONFIG.EMAIL,
    })

    const credits = subscriptionInfo.credits

    logger.info({
      msg: 'Icypeas credits checked',
      event: 'icypeas_credits_checked',
      metadata: {
        credits,
        plan: subscriptionInfo.plan,
        status: subscriptionInfo.status,
      },
    })

    // Check if credits are insufficient
    if (credits < CREDIT_THRESHOLD) {
      const errorMessage = `🚨 [Icypeas] Insufficient credits: ${credits} credits remaining. Cannot process requests.`

      sendSlackNotification({
        channel: 'tech_monitoring',
        text: errorMessage,
      })

      logger.error({
        msg: 'Icypeas credits insufficient',
        event: 'icypeas_credits_insufficient',
        metadata: {
          credits,
          threshold: CREDIT_THRESHOLD,
        },
      })

      throw new Error(
        `Icypeas insufficient credits: ${credits} credits remaining (minimum required: ${CREDIT_THRESHOLD})`,
      )
    }

    // Warn if credits are low but still sufficient
    if (credits < LOW_CREDIT_THRESHOLD) {
      const warningMessage = `⚠️ [Icypeas] Credits running low: ${credits} credits remaining.`

      sendSlackNotification({
        channel: 'tech_monitoring',
        text: warningMessage,
      })

      logger.warn({
        msg: 'Icypeas credits running low',
        event: 'icypeas_credits_low',
        metadata: {
          credits,
          threshold: LOW_CREDIT_THRESHOLD,
        },
      })
    }
  } catch (error) {
    // If we can't check credits, log but don't block (fail open)
    // This prevents a credit check failure from blocking all requests
    logger.error({
      msg: 'Failed to check Icypeas credits',
      event: 'icypeas_credits_check_failed',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    // Only throw if it's already an insufficient credits error
    if (
      error instanceof Error &&
      error.message.includes('insufficient credits')
    ) {
      throw error
    }

    // For other errors (network, API issues), log but continue
    // This prevents credit check failures from blocking all requests
    logger.warn({
      msg: 'Continuing despite credit check failure (fail-open)',
      event: 'icypeas_credits_check_fail_open',
    })
  }
}
