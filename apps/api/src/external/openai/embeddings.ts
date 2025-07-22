import OpenAI from 'openai'
import { OPENAI_CONFIG } from '../../config/openai'

export function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: OPENAI_CONFIG.API_KEY
  })
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient()

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    throw error
  }
}
