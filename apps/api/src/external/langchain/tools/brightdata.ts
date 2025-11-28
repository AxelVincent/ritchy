/**
 * BrightData MCP Integration
 *
 * Provides 60+ web scraping tools via BrightData's MCP server.
 * All tools include automatic metrics tracking and error handling.
 *
 * @example
 * ```typescript
 * import { getTool } from './mcps/brightdata'
 *
 * const searchTool = await getTool('search_engine')
 * const result = await searchTool.invoke({ query: 'TypeScript', engine: 'google' })
 * ```
 */

import type { DynamicStructuredTool } from '@langchain/core/tools'
import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import { logger } from '@ritchy/logger'
import { BRIGHTDATA_CONFIG } from '../../../config/brightdata'
import { trackExternalApiCall } from '../../../metrics/external-api'

// ============================================================================
// TOOL CATALOG
// ============================================================================

/**
 * Complete catalog of available BrightData tools
 *
 * Organized by category with descriptions for documentation and type safety.
 */
const TOOL_CATALOG = {
  // Web Scraping & Search
  search_engine: 'Search Google, Bing, or Yandex. Returns SERP results.',
  scrape_as_markdown: 'Scrape any webpage and convert to clean markdown.',
  scrape_as_html: 'Scrape any webpage and return raw HTML.',
  scrape_batch: 'Scrape up to 10 webpages in parallel.',
  search_engine_batch: 'Run up to 10 search queries in parallel.',
  extract: 'Scrape webpage and extract structured data using AI.',

  // LinkedIn
  web_data_linkedin_person_profile: 'Get LinkedIn person profile data.',
  web_data_linkedin_company_profile: 'Get LinkedIn company profile data.',
  web_data_linkedin_job_listings: 'Get LinkedIn job listings.',
  web_data_linkedin_posts: 'Get LinkedIn post data.',
  web_data_linkedin_people_search: 'Search LinkedIn for people.',

  // E-commerce
  web_data_amazon_product: 'Get Amazon product details.',
  web_data_amazon_product_reviews: 'Get Amazon product reviews.',
  web_data_amazon_product_search: 'Search Amazon for products.',
  web_data_walmart_product: 'Get Walmart product details.',
  web_data_walmart_seller: 'Get Walmart seller information.',
  web_data_ebay_product: 'Get eBay product/listing details.',
  web_data_homedepot_products: 'Get Home Depot product details.',
  web_data_zara_products: 'Get Zara product details.',
  web_data_etsy_products: 'Get Etsy product details.',
  web_data_bestbuy_products: 'Get Best Buy product details.',

  // Social Media
  web_data_instagram_profiles: 'Get Instagram profile data.',
  web_data_instagram_posts: 'Get Instagram post data.',
  web_data_instagram_reels: 'Get Instagram reel data.',
  web_data_instagram_comments: 'Get Instagram comments.',
  web_data_facebook_posts: 'Get Facebook post data.',
  web_data_facebook_marketplace_listings: 'Get Facebook Marketplace listings.',
  web_data_facebook_company_reviews: 'Get Facebook company reviews.',
  web_data_facebook_events: 'Get Facebook event data.',
  web_data_tiktok_profiles: 'Get TikTok profile data.',
  web_data_tiktok_posts: 'Get TikTok post/video data.',
  web_data_tiktok_shop: 'Get TikTok Shop product data.',
  web_data_tiktok_comments: 'Get TikTok video comments.',
  web_data_x_posts: 'Get X/Twitter post data.',
  web_data_youtube_profiles: 'Get YouTube channel data.',
  web_data_youtube_comments: 'Get YouTube video comments.',
  web_data_youtube_videos: 'Get YouTube video metadata.',
  web_data_reddit_posts: 'Get Reddit post data.',

  // Business Data
  web_data_crunchbase_company: 'Get Crunchbase company data.',
  web_data_zoominfo_company_profile: 'Get ZoomInfo company profile.',
  web_data_yahoo_finance_business: 'Get Yahoo Finance company data.',

  // Other Platforms
  web_data_google_maps_reviews: 'Get Google Maps reviews.',
  web_data_google_shopping: 'Get Google Shopping product data.',
  web_data_google_play_store: 'Get Google Play Store app data.',
  web_data_apple_app_store: 'Get Apple App Store app data.',
  web_data_reuter_news: 'Get Reuters news article.',
  web_data_github_repository_file: 'Get GitHub file content.',
  web_data_zillow_properties_listing: 'Get Zillow property listing.',
  web_data_booking_hotel_listings: 'Get Booking.com hotel listing.',

  // Browser Automation
  scraping_browser_navigate: 'Navigate browser to URL.',
  scraping_browser_go_back: 'Navigate browser back.',
  scraping_browser_go_forward: 'Navigate browser forward.',
  scraping_browser_snapshot: 'Capture ARIA snapshot of page.',
  scraping_browser_click_ref: 'Click element by ref.',
  scraping_browser_type_ref: 'Type text into element.',
  scraping_browser_screenshot: 'Take screenshot of page.',
  scraping_browser_network_requests: 'List network requests.',
  scraping_browser_wait_for_ref: 'Wait for element to appear.',
  scraping_browser_get_text: 'Get text content of page.',
  scraping_browser_get_html: 'Get HTML of page.',
  scraping_browser_scroll: 'Scroll to bottom of page.',
  scraping_browser_scroll_to_ref: 'Scroll to element.',

  // Utilities
  session_stats: 'Report tool usage statistics.',
} as const

export type AvailableToolName = keyof typeof TOOL_CATALOG

// ============================================================================
// CLIENT MANAGEMENT
// ============================================================================

let client: MultiServerMCPClient | null = null

const getClient = (): MultiServerMCPClient => {
  if (!client) {
    client = new MultiServerMCPClient({
      brightdata: {
        transport: 'stdio',
        command: 'npx',
        args: ['@brightdata/mcp'],
        env: {
          API_TOKEN: BRIGHTDATA_CONFIG.API_KEY,
          PRO_MODE: 'true',
        },
      },
    })
    logger.info({
      msg: '[BrightData] MCP client initialized',
      event: 'brightdata_mcp_init',
    })
  }
  return client
}

// ============================================================================
// TOOL FUNCTIONS
// ============================================================================

/**
 * Get a specific BrightData tool by name
 *
 * Automatically wraps the tool with:
 * - Metrics tracking via trackExternalApiCall
 * - Structured logging
 * - Error handling
 *
 * @param name - Tool name from TOOL_CATALOG
 * @returns Wrapped tool ready to use
 *
 * @example
 * const searchTool = await getTool('search_engine')
 * const result = await searchTool.invoke({ query: 'TypeScript', engine: 'google' })
 */
export const getBrightDataTool = async (
  name: AvailableToolName,
): Promise<DynamicStructuredTool> => {
  const client = getClient()
  const tools = await client.getTools()
  const tool = tools.find((t) => t.name === name)

  if (!tool) {
    throw new Error(`BrightData tool "${name}" not found`)
  }

  // Wrap with metrics tracking
  const originalInvoke = tool.invoke.bind(tool)
  const wrappedTool = Object.create(Object.getPrototypeOf(tool))
  Object.assign(wrappedTool, tool)
  wrappedTool.name = `brightdata_${name}`

  wrappedTool.invoke = async (input: unknown) => {
    const start = Date.now()

    try {
      logger.debug({
        msg: `[BrightData] ${name} invoked`,
        event: 'brightdata_tool_invoked',
        metadata: { tool: name },
      })

      const result = await trackExternalApiCall('brightdata_mcp', name, () =>
        originalInvoke(input),
      )

      logger.info({
        msg: `[BrightData] ${name} succeeded`,
        event: 'brightdata_tool_success',
        metadata: { tool: name, durationMs: Date.now() - start },
      })

      return result
    } catch (error) {
      logger.error({
        msg: `[BrightData] ${name} failed`,
        event: 'brightdata_tool_error',
        metadata: {
          tool: name,
          durationMs: Date.now() - start,
          error: error instanceof Error ? error.message : String(error),
        },
      })

      // Return error to LLM instead of throwing
      return JSON.stringify({
        error: true,
        message: `Tool ${name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  return wrappedTool as DynamicStructuredTool
}

/**
 * Get multiple BrightData tools by name
 *
 * @param names - Array of tool names
 * @returns Array of wrapped tools
 *
 * @example
 * const tools = await getTools(['search_engine', 'scrape_as_markdown'])
 * const model = anthropic_haiku.bindTools(tools)
 */
const _getBrightDataTools = async (
  names: AvailableToolName[],
): Promise<DynamicStructuredTool[]> => {
  return Promise.all(names.map((name) => getBrightDataTool(name)))
}
