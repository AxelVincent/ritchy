import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { MistralAI } from '@langchain/mistralai'
import { ChatOpenAI } from '@langchain/openai'
import { LLM_CONFIG } from '../../config/llms'

export const anthropic_haiku = new ChatAnthropic({
  model: 'claude-3-5-haiku-20241022',
  temperature: 0,
  apiKey: LLM_CONFIG.ANTHROPIC_API_KEY,
})

export const openai_gpt_4o_mini = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0,
  apiKey: LLM_CONFIG.OPENAI_API_KEY,
})

export const openai_gpt_4o = new ChatOpenAI({
  model: 'gpt-4o',
  temperature: 0,
  apiKey: LLM_CONFIG.OPENAI_API_KEY,
})

export const mistral_8b = new MistralAI({
  model: 'mistral-8b-instruct',
  temperature: 0,
  apiKey: LLM_CONFIG.MISTRAL_API_KEY,
})

export const gemini_2_5_pro = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-pro',
  temperature: 0,
  apiKey: LLM_CONFIG.GOOGLE_AI_API_KEY,
})

export const gemini_2_5_flash = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  temperature: 0,
  apiKey: LLM_CONFIG.GOOGLE_AI_API_KEY,
})
