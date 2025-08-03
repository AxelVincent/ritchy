import { ChatAnthropic } from '@langchain/anthropic'
import { MistralAI } from '@langchain/mistralai'

export const anthropic_haiku = new ChatAnthropic({
  model: 'claude-3-5-haiku-20241022',
  temperature: 0,
})

export const mistral_8b = new MistralAI({
  model: 'mistral-8b-instruct',
  temperature: 0,
})
