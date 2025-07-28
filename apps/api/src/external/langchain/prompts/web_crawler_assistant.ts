import { ChatPromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'

export const WebCrawlerAssistantSchema = z.object({
  internal_urls: z
    .array(z.string().describe('The link to crawl'))
    .min(1)
    .max(30)
    .describe('The list of links to crawl.'),
})

export const webCrawlerAssistant = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert web crawler.
      Reduce the list of links to 30 based on their relevance to create a knowledge base of the business.
      Focus on links that are likely to contain information about the business, company information, team members, services, contact information, social media links.
      Fill the available space with links that are likely to contain useful information about the business.
      `,
  ],
  ['human', '{links}'],
])
