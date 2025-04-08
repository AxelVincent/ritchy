import { z } from 'zod'

const slackConfigSchema = z.object({
  BOT_TOKEN: z.string().min(1, 'Slack bot token is required'),
})

export const SLACK_CONFIG = slackConfigSchema.parse({
  BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
})
