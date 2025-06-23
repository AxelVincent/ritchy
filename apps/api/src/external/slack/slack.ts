import { logger } from '@ritchy/logger'
import { SLACK_CONFIG } from '../../config/slack'

export const SLACK_CHANNEL_IDS = {
  users: 'C08KJF8GATU',
  subscriptions: 'C08L3RX4NL8',
  tech_monitoring: 'C09300H6YQH',
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
      const sendMessage = async () => {
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

        return await response.json()
      }

      let data = await sendMessage()

      // If not in channel, join and retry
      if (!data.ok && data.error === 'not_in_channel') {
        await fetch('https://slack.com/api/conversations.join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SLACK_CONFIG.BOT_TOKEN}`,
          },
          body: JSON.stringify({
            channel: SLACK_CHANNEL_IDS[channel],
          }),
        })

        data = await sendMessage()
      }

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
