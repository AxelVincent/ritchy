import 'dotenv/config'

import { trackExternalApiCall } from '../../metrics/external-api'
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

  const result = await trackExternalApiCall(
    'openai',
    'get_crawl_strategy',
    () => structuredOutput.invoke(prompt),
  )
  return result.internal_urls
}
