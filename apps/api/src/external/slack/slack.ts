import { logger } from '@ritchy/logger'

import { SLACK_CONFIG } from '../../config/slack'
import {
  createSimpleDurationTimer,
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'

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
    const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
    let httpStatusCode = '500'

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
        httpStatusCode = '400'
        throw new Error(`Slack API error: ${data.error || 'Unknown error'}`)
      }

      httpStatusCode = '200'
      metricsTimer.stop({ service: 'slack', endpoint: 'notify' })
      externalApiRequestsCounter.inc({
        service: 'slack',
        endpoint: 'notify',
        status_code: httpStatusCode,
      })

      logger.info({
        msg: 'Slack notification sent successfully',
        event: 'slack_notification_sent',
        metadata: { channel },
      })
    } catch (error) {
      if (httpStatusCode === '500') {
        metricsTimer.stop({ service: 'slack', endpoint: 'notify' })
        externalApiRequestsCounter.inc({
          service: 'slack',
          endpoint: 'notify',
          status_code: httpStatusCode,
        })
      } else if (httpStatusCode === '400') {
        metricsTimer.stop({ service: 'slack', endpoint: 'notify' })
        externalApiRequestsCounter.inc({
          service: 'slack',
          endpoint: 'notify',
          status_code: httpStatusCode,
        })
      }

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
