import { DynamicStructuredTool } from '@langchain/core/tools'
import { logger } from '@ritchy/logger'
import { z } from 'zod'
import { trackExternalApiCall } from '../../../metrics/external-api'
import { callMCPTool } from '../../brightdata/mcp/client'

/**
 * BrightData Scrape as Markdown Tool for LangChain
 *
 * This tool scrapes webpages and converts them to clean markdown format
 * using BrightData's MCP server. Automatically handles anti-bot protection,
 * CAPTCHAs, and IP blocks.
 *
 * @returns DynamicStructuredTool that can be bound to any LLM
 *
 * @example
 * ```typescript
 * import { createBrightDataScrapeTool } from './tools/brightdata_scrape'
 * import { anthropic_haiku } from './llms'
 *
 * const scrapeTool = createBrightDataScrapeTool()
 * const modelWithTools = anthropic_haiku.bindTools([scrapeTool])
 *
 * const response = await modelWithTools.invoke([
 *   { role: 'user', content: 'Scrape the content from https://example.com/article' }
 * ])
 * ```
 */
export const createBrightDataScrapeTool = () => {
  return new DynamicStructuredTool({
    name: 'brightdata_scrape_markdown',
    description: `Scrape a webpage and convert to clean, readable Markdown using BrightData's Web Unlocker. Handles anti-bot protection and CAPTCHAs automatically.

Use this when you need to:
- Extract clean content from web pages
- Convert HTML to readable markdown format
- Bypass anti-bot protection and CAPTCHAs
- Get content from protected websites
- Read articles, blog posts, documentation

The tool returns:
- Clean markdown version of page content
- Removes navigation, ads, footers automatically
- Preserves main content structure
- Works on protected sites that block regular requests

Features:
- Automatic proxy rotation
- CAPTCHA solving
- Browser fingerprint emulation
- JavaScript rendering support
- Anti-bot protection bypass

Cost: Medium (BrightData Web Unlocker)

When to use:
- Need clean, readable content from any URL
- Site has anti-bot protection
- Want markdown format for LLM processing
- Extracting articles or documentation

When NOT to use:
- Need structured data (use web_data_* tools instead)
- Simple pages without protection (use fetch_webpage)
- Need raw HTML (use scrape_as_html instead)`,

    schema: z.object({
      url: z
        .string()
        .url()
        .describe(`The full URL of the webpage to scrape.

Must be a valid HTTP/HTTPS URL.

Examples:
- https://example.com/article
- https://blog.company.com/post/123
- https://docs.example.com/guide
- https://news.site.com/story`),
    }),

    func: async ({ url }) => {
      const startTime = Date.now()

      try {
        logger.debug({
          msg: '[brightdata_scrape_tool] Tool invoked by LLM',
          event: 'brightdata_scrape_tool_invoked',
          metadata: { url },
        })

        // Call BrightData MCP scrape_as_markdown tool with metrics tracking
        const result = await trackExternalApiCall(
          'brightdata_mcp',
          'scrape_as_markdown',
          () => callMCPTool('scrape_as_markdown', { url }),
        )

        const duration = Date.now() - startTime

        logger.info({
          msg: '[brightdata_scrape_tool] Scrape successful',
          event: 'brightdata_scrape_tool_success',
          metadata: {
            url,
            durationMs: duration,
            resultType: typeof result,
            hasContent: !!result,
          },
        })

        // Return formatted result to LLM
        // If result is already a string (markdown), return it directly
        if (typeof result === 'string') {
          return result
        }

        // Otherwise stringify the result
        return JSON.stringify(result, null, 2)
      } catch (error) {
        const duration = Date.now() - startTime

        logger.error({
          msg: '[brightdata_scrape_tool] Scrape failed',
          event: 'brightdata_scrape_tool_error',
          metadata: {
            url,
            durationMs: duration,
            error: error instanceof Error ? error.message : String(error),
          },
        })

        // Return error message to LLM (don't throw)
        return JSON.stringify({
          error: true,
          message: `Failed to scrape webpage: ${error instanceof Error ? error.message : 'Unknown error'}`,
          url,
        })
      }
    },
  })
}
