import { ChatPromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'

export const WebCrawlerAssistantSchema = z.object({
  internal_urls: z
    .array(z.string().describe('The link to crawl'))
    .min(1)
    .max(10)
    .describe('The list of links to crawl.'),
})

export const webCrawlerAssistant = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert web crawler focused on comprehensive business understanding.

Reduce the list to 10 most relevant links using this priority order:

HIGHEST PRIORITY (4-5 links):
- Legal mentions / Mentions légales / Terms & Conditions (for company registration numbers)
- About us / À propos (for company overview and identifiers)
- Contact pages (for official business information)

HIGH PRIORITY (3-4 links):
- Services / Products pages (to understand business offerings)
- Company information / Corporate pages
- Privacy policy (may contain legal identifiers)

MEDIUM PRIORITY (1-2 links):
- Team / Leadership pages (for business context)
- Press / News (for recent company information)

Focus on pages that provide both legal company identifiers (SIREN/SIRET, VAT numbers, registration numbers) AND clear understanding of what the business does. Prioritize official/legal pages first, then business description pages.`,
  ],
  ['human', '{links}'],
])
