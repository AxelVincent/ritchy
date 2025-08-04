import { logger } from '@ritchy/logger'
import { gemini_2_5_pro } from './llms'
import {
  WebDescriptionAssistantSchema,
  webDescriptionAssistant,
} from './prompts/web_description_assistant'
import { vectorStore } from './utils/vector_store'

export const getWebsiteDescription = async (domain: string) => {
  try {
    const content = await vectorStore.similaritySearch('content', 150, {
      must: [
        {
          key: 'metadata.domain',
          match: {
            value: domain,
          },
        },
      ],
    })
    const aggregatedContent = content
      .map((c) => {
        return c.pageContent
      })
      .join(' ')

    logger.info({
      msg: 'Aggregated content',
      event: 'get_website_description_aggregated_content',
      metadata: {
        domain,
        contentCount: content.length,
        contentLength: aggregatedContent.length,
      },
    })
    const prompt = await webDescriptionAssistant.invoke({
      content: aggregatedContent,
    })

    const anthropic_structuredOutput = gemini_2_5_pro.withStructuredOutput(
      WebDescriptionAssistantSchema,
    )
    const anthropic_result = await anthropic_structuredOutput.invoke(prompt)

    logger.info({
      msg: 'Website description',
      event: 'get_website_description_result',
      metadata: {
        domain,
        description: anthropic_result.description,
        shortDescription: anthropic_result.shortDescription,
      },
    })
    return {
      description: anthropic_result.description,
      shortDescription: anthropic_result.shortDescription,
    }
  } catch (error) {
    logger.error({
      msg: 'Error getting website description',
      event: 'get_website_description_error',
      metadata: { domain, error },
    })
    return {
      description: '',
      shortDescription: '',
    }
  }
}
