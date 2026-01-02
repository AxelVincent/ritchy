import { ChatPromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'

export const WebCrawlerAssistantSchema = z.object({
  internal_urls: z
    .array(z.string().describe('The link to crawl'))
    .min(1)
    .max(5)
    .describe('The list of links to crawl.'),
})

export const webCrawlerAssistant = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert web crawler focused on comprehensive business understanding.

Reduce the list to 5 most relevant links using this priority order:

CRITICAL PRIORITY (2 links):
- Legal mentions / Mentions légales / Terms & Conditions (for company registration numbers like SIREN/SIRET, VAT)
- Contact pages (for official business information and identifiers)

HIGH PRIORITY (2 links):
- About us / À propos (for company overview and identifiers)
- Services / Products pages (to understand business offerings)

MEDIUM PRIORITY (1 link - only if slots remain):
- Privacy policy, Team/Leadership, or Pricing pages (whichever is most relevant)

Focus on pages that provide legal company identifiers AND clear understanding of what the business does. Prioritize official/legal pages first.`,
  ],
  ['human', '{links}'],
])
