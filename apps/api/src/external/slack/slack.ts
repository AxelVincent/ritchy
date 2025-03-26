import { logger } from '@ritchy/logger'
import { SLACK_CONFIG } from '../../config/slack'

export const SLACK_CHANNEL_IDS = {
  users: 'C08KJF8GATU',
  subscriptions: 'C08L3RX4NL8',
} as const

export const sendSlackNotification = ({
  text,
  channel,
}: {
  text: string
  channel: keyof typeof SLACK_CHANNEL_IDS
}): void => {
  // Fire and forget
  void (async () => {
    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SLACK_CONFIG.BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: SLACK_CHANNEL_IDS[channel],
          text,
        }),
      })

      const data = await response.json()

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error || 'Unknown error'}`)
      }

      logger.info({
        msg: 'Slack notification sent successfully',
        event: 'slack_notification_sent',
        metadata: { channel },
      })
    } catch (error) {
      logger.error({
        msg: 'Failed to send Slack notification',
        event: 'slack_notification_failed',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          channel,
        },
      })
    }
  })()
}
