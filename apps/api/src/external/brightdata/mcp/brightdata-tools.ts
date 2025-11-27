/**
 * BrightData MCP Tools Library
 *
 * This file defines all 60+ tools available in the BrightData MCP server.
 * Each tool is defined with its schema and description for LLM usage.
 *
 * Tools are organized by category:
 * - Web Scraping & Search
 * - LinkedIn
 * - E-commerce (Amazon, Walmart, eBay, etc.)
 * - Social Media (Instagram, Facebook, TikTok, X/Twitter)
 * - Business Data (Crunchbase, ZoomInfo)
 * - Other Platforms
 * - Browser Automation
 */

import { z } from 'zod'
import type { MCPToolDefinition } from './adapter'
import { createMCPToolAdapter, createMCPToolAdapters } from './adapter'

// ============================================================================
// Web Scraping & Search Tools
// ============================================================================

export const searchEngineTool: MCPToolDefinition = {
  name: 'search_engine',
  description: `Search the web using Google, Bing, or Yandex. Returns SERP results in JSON (Google) or Markdown (Bing/Yandex).

Use this when you need to:
- Find websites or pages
- Discover LinkedIn profiles
- Look up current information
- Verify facts

Supports pagination with cursor parameter.

Cost: Low`,
  schema: z.object({
    query: z.string().describe('The search query'),
    engine: z
      .enum(['google', 'bing', 'yandex'])
      .optional()
      .default('google')
      .describe('Search engine to use'),
    cursor: z.string().optional().describe('Pagination cursor for next page'),
  }),
  costTier: 'low',
}

export const scrapeAsMarkdownTool: MCPToolDefinition = {
  name: 'scrape_as_markdown',
  description: `Scrape a webpage and return clean Markdown. Uses BrightData's unlocker to handle bot protection and CAPTCHA.

Use this when you need to:
- Extract clean content from web pages
- Convert HTML to readable format
- Bypass anti-bot protection
- Get content without HTML clutter

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('The URL to scrape'),
  }),
  costTier: 'medium',
}

export const scrapeAsHtmlTool: MCPToolDefinition = {
  name: 'scrape_as_html',
  description: `Scrape a webpage and return the HTML response body. Handles sites protected by bot detection or CAPTCHA.

Use when you need raw HTML for custom parsing.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('The URL to scrape'),
  }),
  costTier: 'medium',
}

export const scrapeBatchTool: MCPToolDefinition = {
  name: 'scrape_batch',
  description: `Scrape up to 10 webpages in parallel and return an array of URL/content pairs in Markdown format.

Use for bulk scraping operations.

Cost: High (10x medium)`,
  schema: z.object({
    urls: z
      .array(z.string().url())
      .max(10)
      .describe('Array of up to 10 URLs to scrape'),
  }),
  costTier: 'high',
}

export const searchEngineBatchTool: MCPToolDefinition = {
  name: 'search_engine_batch',
  description: `Run up to 10 search queries in parallel. Returns JSON for Google results and Markdown for Bing/Yandex.

Use for bulk search operations.

Cost: Medium`,
  schema: z.object({
    queries: z
      .array(z.string())
      .max(10)
      .describe('Array of up to 10 search queries'),
    engine: z
      .enum(['google', 'bing', 'yandex'])
      .optional()
      .default('google')
      .describe('Search engine to use'),
  }),
  costTier: 'medium',
}

export const extractTool: MCPToolDefinition = {
  name: 'extract',
  description: `Scrape a webpage as Markdown and convert it to structured JSON using AI sampling. Optionally provide a custom extraction prompt.

Use for intelligent data extraction with custom schemas.

Cost: High (scraping + AI)`,
  schema: z.object({
    url: z.string().url().describe('The URL to extract data from'),
    prompt: z
      .string()
      .optional()
      .describe('Custom extraction prompt for AI sampling'),
  }),
  costTier: 'high',
}

// ============================================================================
// LinkedIn Tools
// ============================================================================

export const linkedinPersonProfileTool: MCPToolDefinition = {
  name: 'web_data_linkedin_person_profile',
  description: `Get structured LinkedIn person profile data. Returns clean JSON with name, headline, experience, education, skills.

Use this when you have a LinkedIn profile URL and need detailed profile information.

This is MORE RELIABLE than scraping because it uses BrightData's structured Web Data API.

Cost: Medium`,
  schema: z.object({
    url: z
      .string()
      .url()
      .describe(
        'LinkedIn profile URL (e.g., https://www.linkedin.com/in/username/)',
      ),
  }),
  costTier: 'medium',
}

export const linkedinCompanyProfileTool: MCPToolDefinition = {
  name: 'web_data_linkedin_company_profile',
  description: `Get structured LinkedIn company profile data. Returns company name, description, industry, size, location.

Use when you have a LinkedIn company URL and need company information.

Cost: Medium`,
  schema: z.object({
    url: z
      .string()
      .url()
      .describe(
        'LinkedIn company URL (e.g., https://www.linkedin.com/company/company-name/)',
      ),
  }),
  costTier: 'medium',
}

export const linkedinJobListingsTool: MCPToolDefinition = {
  name: 'web_data_linkedin_job_listings',
  description: `Get structured LinkedIn job listings data. Returns job titles, companies, locations, descriptions.

Use with a LinkedIn jobs URL or search URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('LinkedIn jobs URL or search URL'),
  }),
  costTier: 'medium',
}

export const linkedinPostsTool: MCPToolDefinition = {
  name: 'web_data_linkedin_posts',
  description: `Get structured LinkedIn posts data. Returns post content, author, engagement metrics.

Use with a LinkedIn post URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('LinkedIn post URL'),
  }),
  costTier: 'medium',
}

export const linkedinPeopleSearchTool: MCPToolDefinition = {
  name: 'web_data_linkedin_people_search',
  description: `Get structured LinkedIn people search results. Returns profile URLs, names, headlines, companies.

Use with a LinkedIn people search URL to find profiles matching criteria.

Cost: Medium`,
  schema: z.object({
    url: z
      .string()
      .url()
      .describe(
        'LinkedIn people search URL (e.g., https://www.linkedin.com/search/results/people/?keywords=...)',
      ),
  }),
  costTier: 'medium',
}

// ============================================================================
// E-commerce Tools
// ============================================================================

export const amazonProductTool: MCPToolDefinition = {
  name: 'web_data_amazon_product',
  description: `Get structured Amazon product data. Returns title, price, rating, reviews, description.

Requires a valid product URL containing /dp/.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Amazon product URL containing /dp/'),
  }),
  costTier: 'medium',
}

export const amazonProductReviewsTool: MCPToolDefinition = {
  name: 'web_data_amazon_product_reviews',
  description: `Get structured Amazon product review data.

Requires a valid product URL containing /dp/.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Amazon product URL containing /dp/'),
  }),
  costTier: 'medium',
}

export const amazonProductSearchTool: MCPToolDefinition = {
  name: 'web_data_amazon_product_search',
  description: `Get structured Amazon search results. Limited to first page of results.

Requires a search keyword and Amazon domain URL.

Cost: Medium`,
  schema: z.object({
    keyword: z.string().describe('Search keyword'),
    domain: z.string().url().describe('Amazon domain URL (e.g., amazon.com)'),
  }),
  costTier: 'medium',
}

export const walmartProductTool: MCPToolDefinition = {
  name: 'web_data_walmart_product',
  description: `Get structured Walmart product data.

Requires a product URL containing /ip/.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Walmart product URL containing /ip/'),
  }),
  costTier: 'medium',
}

export const walmartSellerTool: MCPToolDefinition = {
  name: 'web_data_walmart_seller',
  description: `Get structured Walmart seller data.

Requires a valid Walmart seller URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Walmart seller URL'),
  }),
  costTier: 'medium',
}

export const ebayProductTool: MCPToolDefinition = {
  name: 'web_data_ebay_product',
  description: `Get structured eBay product data.

Requires a valid eBay product URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('eBay product URL'),
  }),
  costTier: 'medium',
}

export const homedepotProductsTool: MCPToolDefinition = {
  name: 'web_data_homedepot_products',
  description: `Get structured Home Depot product data.

Requires a valid homedepot.com product URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Home Depot product URL'),
  }),
  costTier: 'medium',
}

export const zaraProductsTool: MCPToolDefinition = {
  name: 'web_data_zara_products',
  description: `Get structured Zara product data.

Requires a valid Zara product URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Zara product URL'),
  }),
  costTier: 'medium',
}

export const etsyProductsTool: MCPToolDefinition = {
  name: 'web_data_etsy_products',
  description: `Get structured Etsy product data.

Requires a valid Etsy product URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Etsy product URL'),
  }),
  costTier: 'medium',
}

export const bestbuyProductsTool: MCPToolDefinition = {
  name: 'web_data_bestbuy_products',
  description: `Get structured Best Buy product data.

Requires a valid Best Buy product URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Best Buy product URL'),
  }),
  costTier: 'medium',
}

// ============================================================================
// Social Media Tools
// ============================================================================

export const instagramProfilesTool: MCPToolDefinition = {
  name: 'web_data_instagram_profiles',
  description: `Get structured Instagram profile data.

Requires a valid Instagram profile URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Instagram profile URL'),
  }),
  costTier: 'medium',
}

export const instagramPostsTool: MCPToolDefinition = {
  name: 'web_data_instagram_posts',
  description: `Get structured Instagram post data.

Requires a valid Instagram post URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Instagram post URL'),
  }),
  costTier: 'medium',
}

export const instagramReelsTool: MCPToolDefinition = {
  name: 'web_data_instagram_reels',
  description: `Get structured Instagram reel data.

Requires a valid Instagram reel URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Instagram reel URL'),
  }),
  costTier: 'medium',
}

export const instagramCommentsTool: MCPToolDefinition = {
  name: 'web_data_instagram_comments',
  description: `Get structured Instagram comments data.

Requires a valid Instagram URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Instagram URL'),
  }),
  costTier: 'medium',
}

export const facebookPostsTool: MCPToolDefinition = {
  name: 'web_data_facebook_posts',
  description: `Get structured Facebook post data.

Requires a valid Facebook post URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Facebook post URL'),
  }),
  costTier: 'medium',
}

export const facebookMarketplaceListingsTool: MCPToolDefinition = {
  name: 'web_data_facebook_marketplace_listings',
  description: `Get structured Facebook Marketplace listing data.

Requires a valid Marketplace listing URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Facebook Marketplace listing URL'),
  }),
  costTier: 'medium',
}

export const facebookCompanyReviewsTool: MCPToolDefinition = {
  name: 'web_data_facebook_company_reviews',
  description: `Get structured Facebook company reviews data.

Requires a valid Facebook company URL and review count.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Facebook company URL'),
    reviewCount: z.number().optional().describe('Number of reviews to fetch'),
  }),
  costTier: 'medium',
}

export const facebookEventsTool: MCPToolDefinition = {
  name: 'web_data_facebook_events',
  description: `Get structured Facebook events data.

Requires a valid Facebook event URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Facebook event URL'),
  }),
  costTier: 'medium',
}

export const tiktokProfilesTool: MCPToolDefinition = {
  name: 'web_data_tiktok_profiles',
  description: `Get structured TikTok profile data.

Requires a valid TikTok profile URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('TikTok profile URL'),
  }),
  costTier: 'medium',
}

export const tiktokPostsTool: MCPToolDefinition = {
  name: 'web_data_tiktok_posts',
  description: `Get structured TikTok post data.

Requires a valid TikTok post URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('TikTok post URL'),
  }),
  costTier: 'medium',
}

export const tiktokShopTool: MCPToolDefinition = {
  name: 'web_data_tiktok_shop',
  description: `Get structured TikTok Shop product data.

Requires a valid TikTok Shop product URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('TikTok Shop product URL'),
  }),
  costTier: 'medium',
}

export const tiktokCommentsTool: MCPToolDefinition = {
  name: 'web_data_tiktok_comments',
  description: `Get structured TikTok comments data.

Requires a valid TikTok video URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('TikTok video URL'),
  }),
  costTier: 'medium',
}

export const xPostsTool: MCPToolDefinition = {
  name: 'web_data_x_posts',
  description: `Get structured X (Twitter) post data.

Requires a valid X post URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('X (Twitter) post URL'),
  }),
  costTier: 'medium',
}

export const youtubeProfilesTool: MCPToolDefinition = {
  name: 'web_data_youtube_profiles',
  description: `Get structured YouTube channel profile data.

Requires a valid YouTube channel URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('YouTube channel URL'),
  }),
  costTier: 'medium',
}

export const youtubeCommentsTool: MCPToolDefinition = {
  name: 'web_data_youtube_comments',
  description: `Get structured YouTube comments data.

Requires a valid YouTube video URL and optional comment count.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('YouTube video URL'),
    num_of_comments: z
      .number()
      .optional()
      .default(10)
      .describe('Number of comments to fetch'),
  }),
  costTier: 'medium',
}

export const youtubeVideosTool: MCPToolDefinition = {
  name: 'web_data_youtube_videos',
  description: `Get structured YouTube video metadata.

Requires a valid YouTube video URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('YouTube video URL'),
  }),
  costTier: 'medium',
}

export const redditPostsTool: MCPToolDefinition = {
  name: 'web_data_reddit_posts',
  description: `Get structured Reddit post data.

Requires a valid Reddit post URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Reddit post URL'),
  }),
  costTier: 'medium',
}

// ============================================================================
// Business Data Tools
// ============================================================================

export const crunchbaseCompanyTool: MCPToolDefinition = {
  name: 'web_data_crunchbase_company',
  description: `Get structured Crunchbase company data.

Requires a valid Crunchbase company URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Crunchbase company URL'),
  }),
  costTier: 'medium',
}

export const zoominfoCompanyProfileTool: MCPToolDefinition = {
  name: 'web_data_zoominfo_company_profile',
  description: `Get structured ZoomInfo company profile data.

Requires a valid ZoomInfo company URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('ZoomInfo company URL'),
  }),
  costTier: 'medium',
}

export const yahooFinanceBusinessTool: MCPToolDefinition = {
  name: 'web_data_yahoo_finance_business',
  description: `Get structured Yahoo Finance company profile data.

Requires a valid Yahoo Finance business URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Yahoo Finance business URL'),
  }),
  costTier: 'medium',
}

// ============================================================================
// Other Platform Tools
// ============================================================================

export const googleMapsReviewsTool: MCPToolDefinition = {
  name: 'web_data_google_maps_reviews',
  description: `Get structured Google Maps reviews data.

Requires a valid Google Maps URL and optional days_limit.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Google Maps URL'),
    days_limit: z
      .number()
      .optional()
      .default(3)
      .describe('Limit reviews to last N days'),
  }),
  costTier: 'medium',
}

export const googleShoppingTool: MCPToolDefinition = {
  name: 'web_data_google_shopping',
  description: `Get structured Google Shopping product data.

Requires a valid Google Shopping product URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Google Shopping product URL'),
  }),
  costTier: 'medium',
}

export const googlePlayStoreTool: MCPToolDefinition = {
  name: 'web_data_google_play_store',
  description: `Get structured Google Play Store app data.

Requires a valid Play Store app URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Google Play Store app URL'),
  }),
  costTier: 'medium',
}

export const appleAppStoreTool: MCPToolDefinition = {
  name: 'web_data_apple_app_store',
  description: `Get structured Apple App Store app data.

Requires a valid App Store app URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Apple App Store app URL'),
  }),
  costTier: 'medium',
}

export const reuterNewsTool: MCPToolDefinition = {
  name: 'web_data_reuter_news',
  description: `Get structured Reuters news data.

Requires a valid Reuters news article URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Reuters news article URL'),
  }),
  costTier: 'medium',
}

export const githubRepositoryFileTool: MCPToolDefinition = {
  name: 'web_data_github_repository_file',
  description: `Get structured GitHub repository file data.

Requires a valid GitHub file URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('GitHub file URL'),
  }),
  costTier: 'medium',
}

export const zillowPropertiesListingTool: MCPToolDefinition = {
  name: 'web_data_zillow_properties_listing',
  description: `Get structured Zillow property listing data.

Requires a valid Zillow listing URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Zillow listing URL'),
  }),
  costTier: 'medium',
}

export const bookingHotelListingsTool: MCPToolDefinition = {
  name: 'web_data_booking_hotel_listings',
  description: `Get structured Booking.com hotel listing data.

Requires a valid Booking.com listing URL.

Cost: Medium`,
  schema: z.object({
    url: z.string().url().describe('Booking.com listing URL'),
  }),
  costTier: 'medium',
}

// ============================================================================
// Browser Automation Tools
// ============================================================================

export const scrapingBrowserNavigateTool: MCPToolDefinition = {
  name: 'scraping_browser_navigate',
  description: `Open or reuse a scraping-browser session and navigate to the provided URL, resetting tracked network requests.

Use for interactive website automation.

Cost: High`,
  schema: z.object({
    url: z.string().url().describe('URL to navigate to'),
  }),
  costTier: 'high',
}

export const scrapingBrowserGoBackTool: MCPToolDefinition = {
  name: 'scraping_browser_go_back',
  description: `Navigate the active scraping-browser session back to the previous page and report the new URL and title.

Cost: High`,
  schema: z.object({}),
  costTier: 'high',
}

export const scrapingBrowserGoForwardTool: MCPToolDefinition = {
  name: 'scraping_browser_go_forward',
  description: `Navigate the active scraping-browser session forward to the next page and report the new URL and title.

Cost: High`,
  schema: z.object({}),
  costTier: 'high',
}

export const scrapingBrowserSnapshotTool: MCPToolDefinition = {
  name: 'scraping_browser_snapshot',
  description: `Capture an ARIA snapshot of the current page listing interactive elements and their refs for later ref-based actions.

Cost: High`,
  schema: z.object({}),
  costTier: 'high',
}

export const scrapingBrowserClickRefTool: MCPToolDefinition = {
  name: 'scraping_browser_click_ref',
  description: `Click an element using its ref from the latest ARIA snapshot; requires a ref and human-readable element description.

Cost: High`,
  schema: z.object({
    ref: z.string().describe('Element ref from ARIA snapshot'),
    description: z.string().describe('Human-readable element description'),
  }),
  costTier: 'high',
}

export const scrapingBrowserTypeRefTool: MCPToolDefinition = {
  name: 'scraping_browser_type_ref',
  description: `Fill an element identified by ref from the ARIA snapshot, optionally pressing Enter to submit after typing.

Cost: High`,
  schema: z.object({
    ref: z.string().describe('Element ref from ARIA snapshot'),
    text: z.string().describe('Text to type'),
    pressEnter: z
      .boolean()
      .optional()
      .default(false)
      .describe('Press Enter after typing'),
  }),
  costTier: 'high',
}

export const scrapingBrowserScreenshotTool: MCPToolDefinition = {
  name: 'scraping_browser_screenshot',
  description: `Capture a screenshot of the current page; supports optional full_page mode for full-length images.

Cost: High`,
  schema: z.object({
    full_page: z
      .boolean()
      .optional()
      .default(false)
      .describe('Capture full page'),
  }),
  costTier: 'high',
}

export const scrapingBrowserNetworkRequestsTool: MCPToolDefinition = {
  name: 'scraping_browser_network_requests',
  description: `List the network requests recorded since page load with HTTP method, URL, and response status for debugging.

Cost: High`,
  schema: z.object({}),
  costTier: 'high',
}

export const scrapingBrowserWaitForRefTool: MCPToolDefinition = {
  name: 'scraping_browser_wait_for_ref',
  description: `Wait until an element identified by ARIA ref becomes visible, with an optional timeout in milliseconds.

Cost: High`,
  schema: z.object({
    ref: z.string().describe('Element ref from ARIA snapshot'),
    timeout: z.number().optional().describe('Timeout in milliseconds'),
  }),
  costTier: 'high',
}

export const scrapingBrowserGetTextTool: MCPToolDefinition = {
  name: 'scraping_browser_get_text',
  description: `Return the text content of the current page's body element.

Cost: High`,
  schema: z.object({}),
  costTier: 'high',
}

export const scrapingBrowserGetHtmlTool: MCPToolDefinition = {
  name: 'scraping_browser_get_html',
  description: `Return the HTML content of the current page; avoid the full_page option unless head or script tags are required.

Cost: High`,
  schema: z.object({
    full_page: z
      .boolean()
      .optional()
      .default(false)
      .describe('Include head and scripts'),
  }),
  costTier: 'high',
}

export const scrapingBrowserScrollTool: MCPToolDefinition = {
  name: 'scraping_browser_scroll',
  description: `Scroll to the bottom of the current page in the scraping-browser session.

Cost: High`,
  schema: z.object({}),
  costTier: 'high',
}

export const scrapingBrowserScrollToRefTool: MCPToolDefinition = {
  name: 'scraping_browser_scroll_to_ref',
  description: `Scroll the page until the element referenced in the ARIA snapshot is in view.

Cost: High`,
  schema: z.object({
    ref: z.string().describe('Element ref from ARIA snapshot'),
  }),
  costTier: 'high',
}

export const sessionStatsTool: MCPToolDefinition = {
  name: 'session_stats',
  description: `Report how many times each tool has been called during the current MCP session.

Cost: Free`,
  schema: z.object({}),
  costTier: 'free',
}

// ============================================================================
// Tool Collections
// ============================================================================

/**
 * All available BrightData MCP tools
 */
export const ALL_BRIGHTDATA_TOOLS: MCPToolDefinition[] = [
  // Web Scraping & Search
  searchEngineTool,
  scrapeAsMarkdownTool,
  scrapeAsHtmlTool,
  scrapeBatchTool,
  searchEngineBatchTool,
  extractTool,

  // LinkedIn
  linkedinPersonProfileTool,
  linkedinCompanyProfileTool,
  linkedinJobListingsTool,
  linkedinPostsTool,
  linkedinPeopleSearchTool,

  // E-commerce
  amazonProductTool,
  amazonProductReviewsTool,
  amazonProductSearchTool,
  walmartProductTool,
  walmartSellerTool,
  ebayProductTool,
  homedepotProductsTool,
  zaraProductsTool,
  etsyProductsTool,
  bestbuyProductsTool,

  // Social Media
  instagramProfilesTool,
  instagramPostsTool,
  instagramReelsTool,
  instagramCommentsTool,
  facebookPostsTool,
  facebookMarketplaceListingsTool,
  facebookCompanyReviewsTool,
  facebookEventsTool,
  tiktokProfilesTool,
  tiktokPostsTool,
  tiktokShopTool,
  tiktokCommentsTool,
  xPostsTool,
  youtubeProfilesTool,
  youtubeCommentsTool,
  youtubeVideosTool,
  redditPostsTool,

  // Business Data
  crunchbaseCompanyTool,
  zoominfoCompanyProfileTool,
  yahooFinanceBusinessTool,

  // Other Platforms
  googleMapsReviewsTool,
  googleShoppingTool,
  googlePlayStoreTool,
  appleAppStoreTool,
  reuterNewsTool,
  githubRepositoryFileTool,
  zillowPropertiesListingTool,
  bookingHotelListingsTool,

  // Browser Automation
  scrapingBrowserNavigateTool,
  scrapingBrowserGoBackTool,
  scrapingBrowserGoForwardTool,
  scrapingBrowserSnapshotTool,
  scrapingBrowserClickRefTool,
  scrapingBrowserTypeRefTool,
  scrapingBrowserScreenshotTool,
  scrapingBrowserNetworkRequestsTool,
  scrapingBrowserWaitForRefTool,
  scrapingBrowserGetTextTool,
  scrapingBrowserGetHtmlTool,
  scrapingBrowserScrollTool,
  scrapingBrowserScrollToRefTool,
  sessionStatsTool,
]

// ============================================================================
// Convenience Functions - Create Tool Groups
// ============================================================================

/**
 * Create all BrightData MCP tools as LangChain tools
 */
export const createAllBrightDataTools = () => {
  return createMCPToolAdapters(ALL_BRIGHTDATA_TOOLS)
}

/**
 * Create basic web research tools (search + scraping)
 */
export const createWebResearchTools = () => {
  return createMCPToolAdapters([
    searchEngineTool,
    scrapeAsMarkdownTool,
    scrapeAsHtmlTool,
  ])
}

/**
 * Create LinkedIn-specific tools
 */
export const createLinkedInTools = () => {
  return createMCPToolAdapters([
    linkedinPersonProfileTool,
    linkedinCompanyProfileTool,
    linkedinJobListingsTool,
    linkedinPostsTool,
    linkedinPeopleSearchTool,
  ])
}

/**
 * Create e-commerce scraping tools
 */
export const createEcommerceTools = () => {
  return createMCPToolAdapters([
    amazonProductTool,
    amazonProductReviewsTool,
    amazonProductSearchTool,
    walmartProductTool,
    ebayProductTool,
  ])
}

/**
 * Create social media scraping tools
 */
export const createSocialMediaTools = () => {
  return createMCPToolAdapters([
    instagramProfilesTool,
    instagramPostsTool,
    facebookPostsTool,
    tiktokProfilesTool,
    tiktokPostsTool,
    xPostsTool,
    youtubeProfilesTool,
  ])
}

/**
 * Create business data tools
 */
export const createBusinessDataTools = () => {
  return createMCPToolAdapters([
    linkedinPersonProfileTool,
    linkedinCompanyProfileTool,
    crunchbaseCompanyTool,
    zoominfoCompanyProfileTool,
    yahooFinanceBusinessTool,
  ])
}

/**
 * Create browser automation tools
 */
export const createBrowserAutomationTools = () => {
  return createMCPToolAdapters([
    scrapingBrowserNavigateTool,
    scrapingBrowserSnapshotTool,
    scrapingBrowserClickRefTool,
    scrapingBrowserTypeRefTool,
    scrapingBrowserScreenshotTool,
    scrapingBrowserGetTextTool,
  ])
}

// ============================================================================
// Individual Tool Creators (for backwards compatibility)
// ============================================================================

export const createSearchEngineTool = () =>
  createMCPToolAdapter(searchEngineTool)
export const createScrapeAsMarkdownTool = () =>
  createMCPToolAdapter(scrapeAsMarkdownTool)
export const createLinkedInPersonProfileTool = () =>
  createMCPToolAdapter(linkedinPersonProfileTool)
export const createLinkedInCompanyProfileTool = () =>
  createMCPToolAdapter(linkedinCompanyProfileTool)
export const createLinkedInPeopleSearchTool = () =>
  createMCPToolAdapter(linkedinPeopleSearchTool)
