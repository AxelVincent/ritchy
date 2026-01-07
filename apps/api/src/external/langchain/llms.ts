import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { MistralAI } from '@langchain/mistralai'
import { ChatOpenAI } from '@langchain/openai'
import { LLM_CONFIG } from '../../config/llms'

export const anthropic_haiku = new ChatAnthropic({
  model: 'claude-haiku-4-5-20251001',
  temperature: 0,
  apiKey: LLM_CONFIG.ANTHROPIC_API_KEY,
})

export const anthropic_sonnet = new ChatAnthropic({
  model: 'claude-sonnet-4-20250514',
  temperature: 0,
  apiKey: LLM_CONFIG.ANTHROPIC_API_KEY,
})

/** @internal OpenAI GPT-4o-mini - currently unused, kept for potential future use */
const _openai_gpt_4o_mini = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0,
  apiKey: LLM_CONFIG.OPENAI_API_KEY,
})

/** @internal OpenAI GPT-4o - currently unused, kept for potential future use */
const _openai_gpt_4o = new ChatOpenAI({
  model: 'gpt-4o',
  temperature: 0,
  apiKey: LLM_CONFIG.OPENAI_API_KEY,
})

/** @internal Mistral 8B - currently unused, kept for potential future use */
const _mistral_8b = new MistralAI({
  model: 'mistral-8b-instruct',
  temperature: 0,
  apiKey: LLM_CONFIG.MISTRAL_API_KEY,
})

// Suppress unused variable warnings - kept for potential future use
void _openai_gpt_4o_mini
void _openai_gpt_4o
void _mistral_8b

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
