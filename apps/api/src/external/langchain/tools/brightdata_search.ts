import { DynamicStructuredTool } from '@langchain/core/tools'
import { logger } from '@ritchy/logger'
import { z } from 'zod'
import { trackExternalApiCall } from '../../../metrics/external-api'
import { callMCPTool } from '../../brightdata/mcp/client'

/**
 * BrightData Search Engine Tool for LangChain
 *
 * This tool provides web search capabilities using BrightData's MCP server.
 * Supports Google, Bing, and Yandex search engines with structured results.
 *
 * @returns DynamicStructuredTool that can be bound to any LLM
 *
 * @example
 * ```typescript
 * import { createBrightDataSearchTool } from './tools/brightdata_search'
 * import { anthropic_haiku } from './llms'
 *
 * const searchTool = createBrightDataSearchTool()
 * const modelWithTools = anthropic_haiku.bindTools([searchTool])
 *
 * const response = await modelWithTools.invoke([
 *   { role: 'user', content: 'Search for TypeScript documentation' }
 * ])
 * ```
 */
export const createBrightDataSearchTool = () => {
  return new DynamicStructuredTool({
    name: 'brightdata_search_engine',
    description: `Search the web using Google, Bing, or Yandex via BrightData. Returns SERP results in JSON (Google) or Markdown (Bing/Yandex).

Use this when you need to:
- Find websites or pages
- Discover LinkedIn profiles or social media
- Look up current information
- Verify facts
- Research companies or people

The tool returns:
- Search result titles and URLs
- Snippet/description for each result
- Pagination support via cursor

Supports pagination with cursor parameter for next page results.

Cost: Low (BrightData search API)

When to use:
- Need current web information
- Finding specific websites
- Researching topics
- Discovering online presence`,

    schema: z.object({
      query: z.string().describe(`The search query.

Examples:
- "machine learning tutorials"
- "site:linkedin.com/in/ John Doe Acme Corp"
- "React hooks documentation"
- "best practices TypeScript 2024"`),

      engine: z
        .enum(['google', 'bing', 'yandex'])
        .optional()
        .default('google')
        .describe(
          'Search engine to use. Google provides JSON results, Bing/Yandex provide Markdown. Default: google',
        ),

      cursor: z
        .string()
        .optional()
        .describe(
          'Pagination cursor for next page of results. Use the cursor from previous response.',
        ),
    }),

    func: async ({ query, engine = 'google', cursor }) => {
      const startTime = Date.now()

      try {
        logger.debug({
          msg: '[brightdata_search_tool] Tool invoked by LLM',
          event: 'brightdata_search_tool_invoked',
          metadata: {
            query,
            engine,
            hasCursor: !!cursor,
          },
        })

        // Call BrightData MCP search_engine tool with metrics tracking
        const result = await trackExternalApiCall(
          'brightdata_mcp',
          'search_engine',
          () =>
            callMCPTool('search_engine', {
              query,
              engine,
              ...(cursor && { cursor }),
            }),
        )

        const duration = Date.now() - startTime

        logger.info({
          msg: '[brightdata_search_tool] Search successful',
          event: 'brightdata_search_tool_success',
          metadata: {
            query,
            engine,
            durationMs: duration,
            resultType: typeof result,
          },
        })

        // Return formatted result to LLM
        return JSON.stringify(result, null, 2)
      } catch (error) {
        const duration = Date.now() - startTime

        logger.error({
          msg: '[brightdata_search_tool] Search failed',
          event: 'brightdata_search_tool_error',
          metadata: {
            query,
            engine,
            durationMs: duration,
            error: error instanceof Error ? error.message : String(error),
          },
        })

        // Return error message to LLM (don't throw)
        return JSON.stringify({
          error: true,
          message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          query,
          engine,
        })
      }
    },
  })
}
