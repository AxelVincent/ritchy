import { ChatPromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'

export const WebDescriptionAssistantSchema = z.object({
  description: z.string().describe('The description of the business..'),
  shortDescription: z
    .string()
    .describe('A short description of the business. 150 words or less.'),
})

export const webDescriptionAssistant = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert web description assistant who MUST ALWAYS write in clear, professional English.

    Input: You will receive markdown content from a website, which may be in any language.
    
    Task: Your job is to analyze this content and produce TWO descriptions:
    
    1. MAIN DESCRIPTION:
       - Write a detailed business description in clear English
       - Use proper markdown formatting
       - Include all relevant business information
       - Maintain professional business language
    
    2. SHORT DESCRIPTION:
       - Create a concise business summary in clear English
       - Maximum 150 words
       - Plain text format (no markdown)
       - Focus on core business value proposition
    
    IMPORTANT: Even if the input content is in another language, you MUST ALWAYS write both descriptions in English.
    `,
  ],
  ['human', '{content}'],
])
