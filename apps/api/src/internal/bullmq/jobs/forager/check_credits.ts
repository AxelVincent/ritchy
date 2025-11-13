import { logger } from '@ritchy/logger'
import { FORAGER_CONFIG } from '../../../../config/forager'
import { sendSlackNotification } from '../../../../external/slack/slack'
import { enqueueForagerUserInformationJob } from './user_information/queue'

const CREDIT_THRESHOLD = 20 // Minimum credits required to proceed
const LOW_CREDIT_THRESHOLD = 500 // Threshold for low credit warning

/**
 * Checks if Forager has sufficient credits before making API calls
 * @throws Error if credits are insufficient
 */
export const checkForagerCredits = async (): Promise<void> => {
  try {
    const userInfo = await enqueueForagerUserInformationJob()

    // Find the account matching our ACCOUNT_ID
    const account = userInfo.accounts.find(
      (acc) => acc.id.toString() === FORAGER_CONFIG.ACCOUNT_ID,
    )

    if (!account) {
      logger.error({
        msg: 'Forager account not found for credit check',
        event: 'forager_account_not_found_credit_check',
        metadata: {
          accountId: FORAGER_CONFIG.ACCOUNT_ID,
          availableAccountIds: userInfo.accounts.map((acc) => acc.id),
        },
      })
      throw new Error(
        `Forager account ${FORAGER_CONFIG.ACCOUNT_ID} not found in user accounts`,
      )
    }

    const credits = account.subscription.credits_balance

    logger.info({
      msg: 'Forager credits checked',
      event: 'forager_credits_checked',
      metadata: {
        credits,
        accountId: account.id,
        accountName: account.name,
        subscriptionTier: account.subscription.subscription_tier.name,
        isActive: account.subscription.is_active,
      },
    })

    // Check if credits are insufficient
    if (credits < CREDIT_THRESHOLD) {
      const errorMessage = `🚨 [Forager] Insufficient credits: ${credits} credits remaining. Cannot process requests.`

      sendSlackNotification({
        channel: 'tech_monitoring',
        text: errorMessage,
      })

      logger.error({
        msg: 'Forager credits insufficient',
        event: 'forager_credits_insufficient',
        metadata: {
          credits,
          threshold: CREDIT_THRESHOLD,
          accountId: account.id,
        },
      })

      throw new Error(
        `Forager insufficient credits: ${credits} credits remaining (minimum required: ${CREDIT_THRESHOLD})`,
      )
    }

    // Warn if credits are low but still sufficient
    if (credits < LOW_CREDIT_THRESHOLD) {
      const warningMessage = `⚠️ [Forager] Credits running low: ${credits} credits remaining.`

      sendSlackNotification({
        channel: 'tech_monitoring',
        text: warningMessage,
      })

      logger.warn({
        msg: 'Forager credits running low',
        event: 'forager_credits_low',
        metadata: {
          credits,
          threshold: LOW_CREDIT_THRESHOLD,
          accountId: account.id,
        },
      })
    }
  } catch (error) {
    // If we can't check credits, log but don't block (fail open)
    // This prevents a credit check failure from blocking all requests
    logger.error({
      msg: 'Failed to check Forager credits',
      event: 'forager_credits_check_failed',
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
      event: 'forager_credits_check_fail_open',
    })
  }
}
