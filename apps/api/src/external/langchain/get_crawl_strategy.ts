import 'dotenv/config'
import { ChatAnthropic } from '@langchain/anthropic'
import {
  WebCrawlerAssistantSchema,
  webCrawlerAssistant,
} from './prompts/web_crawler_assistant'

const llm = new ChatAnthropic({
  model: 'claude-3-5-haiku-20241022',
  temperature: 0,
})

export const getCrawlStrategy = async (
  urls: string[],
  businessName: string,
) => {
  const structuredOutput = llm.withStructuredOutput(WebCrawlerAssistantSchema)

  const prompt = await webCrawlerAssistant.invoke({
    links: urls,
    business_name: businessName,
  })

  const result = await structuredOutput.invoke(prompt)
  return result.internal_urls
}
