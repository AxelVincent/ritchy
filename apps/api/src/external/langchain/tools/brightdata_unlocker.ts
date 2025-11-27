import { DynamicStructuredTool } from '@langchain/core/tools'
import { logger } from '@ritchy/logger'
import { z } from 'zod'
import { enqueueBrightdataJob } from '../../../internal/bullmq/jobs/brightdata/queue'
import { trackExternalApiCall } from '../../../metrics/external-api'

/**
 * BrightData Web Unlocker tool for LLM agents
 *
 * This tool is completely agnostic and can be used by any agent.
 * It fetches content from websites that might be behind anti-bot protection,
 * CAPTCHAs, or other blocking mechanisms.
 *
 * @returns DynamicStructuredTool that can be bound to any LLM
 *
 * @example
 * ```typescript
 * import { createBrightdataUnlockerTool } from './tools/brightdata_unlocker'
 * import { anthropic_haiku } from './llms'
 *
 * const unlocker = createBrightdataUnlockerTool()
 * const modelWithTools = anthropic_haiku.bindTools([unlocker])
 *
 * const response = await modelWithTools.invoke([
 *   { role: 'user', content: 'Fetch content from https://example.com' }
 * ])
 * ```
 */
export const createBrightdataUnlockerTool = () => {
  return new DynamicStructuredTool({
    name: 'brightdata_unlocker',
    description: `Fetch content from websites using BrightData Web Unlocker. This tool can bypass anti-bot protection, CAPTCHAs, and IP blocks that normal fetching cannot handle.

Use this tool when you need to:
- Access websites that block regular requests
- Bypass CAPTCHA protection
- Get content from sites with anti-bot measures
- Fetch data from protected or restricted websites

The tool returns:
- Full HTML content of the page
- HTTP status code
- Response headers
- Success/error status

Features:
- Automatic proxy rotation
- CAPTCHA solving
- Browser fingerprint emulation
- JavaScript rendering

Limitations:
- 45-second timeout per request
- Higher cost than regular fetching
- Should be used only when regular fetch fails
- Not suitable for downloading large files

When to use this instead of fetch_webpage:
- Regular fetch returned 403/429/503 errors
- Page requires JavaScript rendering
- Site has CAPTCHA or anti-bot protection
- IP-based rate limiting blocks you`,

    schema: z.object({
      url: z
        .string()
        .url()
        .describe(`The full URL of the website to fetch.

Must be a valid HTTP/HTTPS URL.

Examples:
- https://example.com
- https://protected-site.com/data
- https://site-with-captcha.com`),
    }),

    func: async ({ url }) => {
      const startTime = Date.now()

      try {
        logger.debug({
          msg: '[brightdata_unlocker_tool] Tool invoked by LLM',
          event: 'brightdata_unlocker_tool_invoked',
          metadata: { url },
        })

        // Use BullMQ queue with trackExternalApiCall wrapper
        const result = await trackExternalApiCall(
          'brightdata',
          'web_unlocker_tool',
          () => enqueueBrightdataJob(url),
        )

        const duration = Date.now() - startTime

        logger.info({
          msg: '[brightdata_unlocker_tool] Successfully fetched content',
          event: 'brightdata_unlocker_tool_success',
          metadata: {
            url,
            statusCode: result.status_code,
            success: result.success,
            contentLength: result.body.length,
            durationMs: duration,
          },
        })

        // Return formatted response for LLM
        return JSON.stringify(
          {
            success: result.success,
            statusCode: result.status_code,
            url,
            contentLength: result.body.length,
            // Return first 8000 chars to avoid overwhelming context
            content: result.body.slice(0, 8000),
            headers: result.headers,
            error: result.error,
          },
          null,
          2,
        )
      } catch (error) {
        const duration = Date.now() - startTime

        logger.error({
          msg: '[brightdata_unlocker_tool] Failed to fetch content',
          event: 'brightdata_unlocker_tool_error',
          metadata: {
            url,
            durationMs: duration,
            error: error instanceof Error ? error.message : String(error),
          },
        })

        // Return error message to LLM
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred'

        return JSON.stringify({
          error: true,
          message: `Failed to fetch with BrightData: ${errorMessage}`,
          url,
        })
      }
    },
  })
}
