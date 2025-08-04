import 'dotenv/config'

import { anthropic_haiku } from './llms'
import {
  WebCrawlerAssistantSchema,
  webCrawlerAssistant,
} from './prompts/web_crawler_assistant'

export const getCrawlStrategy = async (
  urls: string[],
  businessName: string,
) => {
  const structuredOutput = anthropic_haiku.withStructuredOutput(
    WebCrawlerAssistantSchema,
  )

  const prompt = await webCrawlerAssistant.invoke({
    links: urls,
    business_name: businessName,
  })

  const result = await structuredOutput.invoke(prompt)
  return result.internal_urls
}
