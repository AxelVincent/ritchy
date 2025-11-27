# LangChain Tools Library

This folder contains **reusable, prompt-agnostic tools** that can be bound to any LLM agent. Each tool is self-contained and handles a specific capability.

## Philosophy

- ✅ **Prompt-agnostic**: Tools don't contain domain-specific logic or prompts
- ✅ **Reusable**: Can be used by any agent for any purpose
- ✅ **Self-documenting**: Clear descriptions guide LLM on when/how to use
- ✅ **Type-safe**: Full TypeScript types with Zod schemas
- ✅ **Observable**: Comprehensive logging for debugging
- ✅ **Error-resilient**: Graceful error handling with informative messages

## Quick Start

### BrightData MCP Tools (Recommended - 60+ Tools)

```typescript
import { createLinkedInTools, createSearchEngineTool } from './tools'
import { anthropic_haiku } from './llms'

// Get all LinkedIn tools (profiles, search, company, posts, jobs)
const tools = createLinkedInTools()
const model = anthropic_haiku.bindTools(tools)

// Or create individual tools
const searchTool = createSearchEngineTool() // Google/Bing search
const linkedInTool = createLinkedInPersonProfileTool() // Structured profile data
```

**Why use MCP tools?**
- ✅ **60+ tools** from a single integration
- ✅ **Structured data** - No HTML parsing needed
- ✅ **One vendor** - Single API key (BrightData)
- ✅ **Minimal code** - Generic adapter handles all tools
- ✅ **Auto-updates** - New BrightData features automatically available

## Available Tools

### 🌐 BrightData MCP Tools (60+ Tools)

BrightData MCP provides 60+ production-ready tools via the Model Context Protocol. All tools return structured JSON data.

**Tool Categories:**
- **Web Scraping** (6 tools): Search engines, markdown scraping, batch operations, AI extraction
- **LinkedIn** (5 tools): Person profiles, company profiles, job listings, posts, people search
- **E-commerce** (10 tools): Amazon, Walmart, eBay, Etsy, Home Depot, Zara, Best Buy
- **Social Media** (18 tools): Instagram, Facebook, TikTok, X/Twitter, YouTube, Reddit
- **Business Data** (3 tools): Crunchbase, ZoomInfo, Yahoo Finance
- **Other Platforms** (8 tools): Google Maps, Google Shopping, App Stores, GitHub, Zillow, Booking
- **Browser Automation** (14 tools): Navigate, click, type, screenshot, scroll, ARIA snapshots

**Key Features:**
- Structured JSON responses (no HTML parsing!)
- Automatic anti-bot protection handling
- Built-in rate limiting
- Comprehensive error handling
- Cost-aware tool selection

**Usage Example:**
```typescript
import {
  createLinkedInTools,
  createEcommerceTools,
  createSocialMediaTools,
  createAllBrightDataTools,
} from './tools'

// Specialized tool sets
const linkedInTools = createLinkedInTools() // 5 LinkedIn tools
const ecommerceTools = createEcommerceTools() // 10 e-commerce tools
const socialTools = createSocialMediaTools() // 18 social media tools

// Or get everything
const allTools = createAllBrightDataTools() // All 60+ tools
```

See [BrightData MCP Documentation](#brightdata-mcp-integration) below for full details.

---

## Legacy Custom Tools

These are custom-built tools with direct API integration. Consider migrating to MCP equivalents for better reliability and fewer dependencies.

### 🔍 Brave Search (`brave_search`)

**⚠️ Consider using:** `createSearchEngineTool()` from BrightData MCP (supports Google/Bing)

Search the web using Brave Search API with automatic rate limiting.

**Capabilities:**
- Web search with up to 10 results
- Support for search operators (`site:`, quotes, etc.)
- Rate limited to 1 query/second via BullMQ
- Returns structured results (title, URL, description)

**Use cases:**
- Finding websites or pages
- Discovering LinkedIn profiles
- Looking up current information
- Verifying facts

**Cost:** Low (1 query/second rate limit)

### 🔍 Brave Search (`brave_search`)

Search the web using Brave Search API with automatic rate limiting.

**Capabilities:**
- Web search with up to 10 results
- Support for search operators (`site:`, quotes, etc.)
- Rate limited to 1 query/second via BullMQ
- Returns structured results (title, URL, description)

**Use cases:**
- Finding websites or pages
- Discovering LinkedIn profiles
- Looking up current information
- Verifying facts

**Cost:** Low (1 query/second rate limit)

### 📄 Fetch Webpage (`fetch_webpage`)

Fetch and extract text content from any webpage.

**Capabilities:**
- Fetch HTML and extract readable text
- Remove scripts, styles, HTML tags
- 10-second timeout
- Returns up to 10,000 characters

**Use cases:**
- Reading webpage content
- Verifying information from URLs
- Extracting details from search results
- Getting content behind links

**Cost:** Free (basic HTTP fetch)

### 🔓 BrightData Web Unlocker (`brightdata_unlocker`)

Fetch content from protected websites using BrightData's Web Unlocker.

**Capabilities:**
- Bypass anti-bot protection and CAPTCHAs
- Automatic proxy rotation
- Browser fingerprint emulation
- JavaScript rendering support
- 45-second timeout
- Returns up to 8,000 characters

**Use cases:**
- Accessing sites that block regular requests
- Bypassing CAPTCHA protection
- Getting content from protected websites
- When regular fetch returns 403/429/503 errors

**Cost:** High (paid service, use only when necessary)

**When to use:** Only when `fetch_webpage` fails due to protection

### 🔥 Firecrawl Scraper (`firecrawl_scraper`)

Scrape and convert web pages to clean markdown using Firecrawl.

**Capabilities:**
- Convert HTML to markdown format
- Extract main content (filter ads/navigation)
- JavaScript rendering support
- Country-specific scraping (US default)
- Returns up to 10,000 characters of markdown
- Includes metadata (title, description, etc.)

**Use cases:**
- Extracting clean content from web pages
- Converting documentation to markdown
- Scraping articles and blog posts
- Getting structured content without HTML clutter

**Cost:** Medium (paid service)

**When to use:** Need clean markdown output or main content extraction

## Usage Examples

### Single Tool

```typescript
import { createBraveSearchTool } from './tools'
import { anthropic_haiku } from './llms'

// Create tool instance
const braveSearch = createBraveSearchTool()

// Bind to model
const model = anthropic_haiku.bindTools([braveSearch])

// Use it
const response = await model.invoke([
  { role: 'user', content: 'Search for TypeScript documentation' }
])
```

### Multiple Tools

```typescript
import { createBraveSearchTool, createFetchWebpageTool } from './tools'
import { anthropic_haiku } from './llms'

// Create multiple tools
const tools = [
  createBraveSearchTool(),
  createFetchWebpageTool(),
]

// Bind to model
const model = anthropic_haiku.bindTools(tools)

// LLM will autonomously decide which tool(s) to use
const response = await model.invoke([
  {
    role: 'user',
    content: 'Find the official React documentation and tell me about hooks'
  }
])
```

### Using Convenience Functions

```typescript
import {
  createAllTools,
  createWebResearchTools,
  createAdvancedScrapingTools,
} from './tools'
import { anthropic_haiku } from './llms'

// All available tools (4 tools)
const allTools = createAllTools()
const model1 = anthropic_haiku.bindTools(allTools)

// Basic web research tools (search + simple fetch)
const webTools = createWebResearchTools()
const model2 = anthropic_haiku.bindTools(webTools)

// Advanced scraping tools (all 4 tools for complex scraping)
const scrapingTools = createAdvancedScrapingTools()
const model3 = anthropic_haiku.bindTools(scrapingTools)
```

### Real-World Examples

#### Protected Website Access
```typescript
import {
  createBraveSearchTool,
  createFetchWebpageTool,
  createBrightdataUnlockerTool,
} from './tools'
import { anthropic_haiku } from './llms'

const tools = [
  createBraveSearchTool(),
  createFetchWebpageTool(),
  createBrightdataUnlockerTool(),
]

const model = anthropic_haiku.bindTools(tools)

const response = await model.invoke([
  {
    role: 'user',
    content: `Find and extract pricing information from https://protected-site.com

    Strategy:
    1. Try fetch_webpage first
    2. If that fails with 403/429, use brightdata_unlocker
    3. Return the pricing details`
  }
])
// LLM will automatically try simple fetch first, fall back to BrightData if blocked
```

#### Documentation Scraping
```typescript
import {
  createBraveSearchTool,
  createFirecrawlScraperTool,
} from './tools'
import { anthropic_haiku } from './llms'

const tools = [
  createBraveSearchTool(),
  createFirecrawlScraperTool(),
]

const model = anthropic_haiku.bindTools(tools)

const response = await model.invoke([
  {
    role: 'user',
    content: `Find and summarize the Next.js documentation on Server Components

    Steps:
    1. Search for "Next.js Server Components documentation"
    2. Use firecrawl_scraper to get clean markdown from the docs page
    3. Summarize the key points`
  }
])
// LLM will search, scrape to markdown, and summarize
```

### Domain-Specific Agent Example

```typescript
import { createBraveSearchTool } from './tools'
import { anthropic_haiku } from './llms'

// Create a LinkedIn profile finder agent
export const findLinkedInProfile = async (
  firstName: string,
  lastName: string,
  company: string,
) => {
  const tool = createBraveSearchTool()
  const model = anthropic_haiku.bindTools([tool])

  const response = await model.invoke([
    {
      role: 'user',
      content: `Find the LinkedIn profile for ${firstName} ${lastName} who works at ${company}.

      Strategy:
      1. First search: "${firstName} ${lastName}" "${company}" site:linkedin.com/in/
      2. If needed, broader search: ${firstName} ${lastName} ${company} linkedin

      Return the profile URL if found, or null if not found.`,
    },
  ])

  return response
}
```

## How LLM Tool Calling Works

### 1. **Tool Definition**

Tools define:
- **name**: Identifier for the tool
- **description**: When and how to use it (critical for LLM!)
- **schema**: Input parameters with descriptions
- **func**: Implementation that executes when called

### 2. **Autonomous Decision Making**

The LLM:
- Reads your prompt and available tools
- Decides if it needs to use a tool
- Chooses which tool(s) to use
- Determines the parameters
- Calls the tool(s)

### 3. **Automatic Execution Loop**

LangChain automatically:
- Executes tool functions
- Feeds results back to LLM
- Allows LLM to call more tools if needed
- Returns final response when done

### 4. **Example Flow**

```
User: "Find the GitHub repo for Next.js"
  ↓
LLM: "I'll search for it"
  ↓
Tool: brave_search("Next.js GitHub")
  ↓
Results: [{ title: "vercel/next.js", url: "https://github.com/vercel/next.js", ... }]
  ↓
LLM: "Found it! The repo is https://github.com/vercel/next.js"
  ↓
Response to User
```

## Creating New Tools

Follow this template:

```typescript
import { DynamicStructuredTool } from '@langchain/core/tools'
import { logger } from '@ritchy/logger'
import { z } from 'zod'

export const createMyTool = () => {
  return new DynamicStructuredTool({
    name: 'my_tool',
    description: `Clear description of what this tool does and when to use it.

Include examples and limitations.`,

    schema: z.object({
      param1: z.string().describe('Parameter description'),
      param2: z.number().optional().describe('Optional parameter'),
    }),

    func: async ({ param1, param2 }) => {
      const startTime = Date.now()

      try {
        logger.debug({
          msg: '[my_tool] Tool invoked',
          event: 'my_tool_invoked',
          metadata: { param1, param2 },
        })

        // Your tool logic here
        const result = await doSomething(param1, param2)

        logger.info({
          msg: '[my_tool] Success',
          event: 'my_tool_success',
          metadata: {
            durationMs: Date.now() - startTime,
          },
        })

        // Return string or JSON string
        return JSON.stringify(result)
      } catch (error) {
        logger.error({
          msg: '[my_tool] Failed',
          event: 'my_tool_error',
          metadata: {
            error: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - startTime,
          },
        })

        // Return error to LLM
        return JSON.stringify({
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
  })
}
```

## Best Practices

### 1. **Clear Tool Descriptions**

❌ Bad:
```typescript
description: 'Search the web'
```

✅ Good:
```typescript
description: `Search the web using Brave Search API. Returns top search results.

Use this when you need to:
- Find current information
- Discover URLs
- Verify facts

Supports search operators:
- Quotes for exact phrases
- site: for specific domains`
```

### 2. **Descriptive Parameters**

❌ Bad:
```typescript
schema: z.object({
  q: z.string(),
})
```

✅ Good:
```typescript
schema: z.object({
  query: z.string().describe(`The search query.

Examples:
- "machine learning"
- site:github.com TypeScript
- React hooks tutorial`),
})
```

### 3. **Return Structured Data**

```typescript
// Return JSON for structured data
return JSON.stringify({
  results: [...],
  count: 5,
})

// Or plain text for simple responses
return 'The answer is 42'
```

### 4. **Handle Errors Gracefully**

```typescript
try {
  const result = await apiCall()
  return JSON.stringify(result)
} catch (error) {
  // Don't throw - return error message for LLM to handle
  return JSON.stringify({
    error: true,
    message: 'API call failed: ' + error.message,
  })
}
```

### 5. **Add Comprehensive Logging**

```typescript
logger.debug({ msg: 'Tool invoked', event: 'tool_start', metadata: { ...params } })
logger.info({ msg: 'Tool succeeded', event: 'tool_success', metadata: { duration } })
logger.error({ msg: 'Tool failed', event: 'tool_error', metadata: { error } })
```

## Testing Tools

```typescript
import { createBraveSearchTool } from './tools'

// Test tool directly
const tool = createBraveSearchTool()
const result = await tool.func({ query: 'test query', maxResults: 3 })
console.log(result)

// Test with LLM
import { anthropic_haiku } from './llms'

const model = anthropic_haiku.bindTools([tool])
const response = await model.invoke([
  { role: 'user', content: 'Search for TypeScript' }
])
```

## Rate Limiting & Performance

- **Brave Search**: 1 query/second (enforced via BullMQ)
- **Fetch Webpage**: 10-second timeout per request
- Tools use queues for rate limiting across instances
- Failed requests retry automatically (via BullMQ)

## Monitoring

All tools emit structured logs:
- `*_tool_invoked`: When LLM calls the tool
- `*_tool_success`: Successful completion
- `*_tool_error`: Errors during execution

View metrics in:
- Application logs (Pino)
- Queue dashboard at `/queuedash`
- Prometheus metrics at `/metrics`

---

# BrightData MCP Integration

## Overview

The BrightData MCP (Model Context Protocol) integration provides access to 60+ production-ready tools via a single connection. This is the **recommended approach** for most use cases due to its simplicity and comprehensive feature set.

## Architecture

```
┌─────────────────┐
│  Your LangChain │
│      Agent      │
└────────┬────────┘
         │
         │ bindTools([...])
         │
┌────────▼─────────────────┐
│  MCP Tool Adapters       │  (apps/api/src/external/mcp/adapter.ts)
│  - Generic wrapper       │
│  - Metrics tracking      │
│  - Error handling        │
└────────┬─────────────────┘
         │
         │ callMCPTool()
         │
┌────────▼─────────────────┐
│  MCP Client              │  (apps/api/src/external/mcp/client.ts)
│  - Connection pooling    │
│  - Stdio transport       │
└────────┬─────────────────┘
         │
         │ stdio
         │
┌────────▼─────────────────┐
│  BrightData MCP Server   │  (npx @brightdata/mcp)
│  - 60+ tools             │
│  - Anti-bot handling     │
│  - Structured responses  │
└──────────────────────────┘
```

## Setup

### 1. Prerequisites

- BrightData API key (already configured in `BRIGHTDATA_CONFIG.API_KEY`)
- Node.js runtime (already available)
- MCP SDK (already installed)

### 2. Configuration

No additional configuration needed! The MCP client automatically uses your existing `BRIGHTDATA_API_KEY` environment variable.

Optional environment variables:
```bash
# Already set via BRIGHTDATA_CONFIG
BRIGHTDATA_API_KEY=your-api-key-here

# Optional: Enable Pro Mode (60+ tools) - Default: true
PRO_MODE=true
```

## Available Tool Categories

### Web Scraping & Search (6 tools)
```typescript
import { createSearchEngineTool, createScrapeAsMarkdownTool } from './tools'

const searchTool = createSearchEngineTool() // Google/Bing/Yandex search
const scrapeTool = createScrapeAsMarkdownTool() // Markdown conversion
```

**Tools:**
- `search_engine` - Search Google/Bing/Yandex with SERP results
- `scrape_as_markdown` - Convert webpages to clean markdown
- `scrape_as_html` - Get raw HTML with anti-bot handling
- `scrape_batch` - Scrape up to 10 pages in parallel
- `search_engine_batch` - Run up to 10 searches in parallel
- `extract` - AI-powered structured data extraction

### LinkedIn (5 tools)
```typescript
import { createLinkedInTools } from './tools'

const tools = createLinkedInTools() // All 5 LinkedIn tools
```

**Tools:**
- `web_data_linkedin_person_profile` - **Structured person profile data**
- `web_data_linkedin_company_profile` - Company profiles
- `web_data_linkedin_job_listings` - Job listings
- `web_data_linkedin_posts` - Post data
- `web_data_linkedin_people_search` - **Search for people**

**Key Benefit:** Returns structured JSON instead of HTML - **much more reliable than scraping**!

### E-commerce (10 tools)
```typescript
import { createEcommerceTools } from './tools'

const tools = createEcommerceTools()
```

**Platforms:** Amazon (product, reviews, search), Walmart (product, seller), eBay, Home Depot, Zara, Etsy, Best Buy

### Social Media (18 tools)
```typescript
import { createSocialMediaTools } from './tools'

const tools = createSocialMediaTools()
```

**Platforms:** Instagram (profiles, posts, reels, comments), Facebook (posts, marketplace, reviews, events), TikTok (profiles, posts, shop, comments), X/Twitter (posts), YouTube (profiles, videos, comments), Reddit (posts)

### Business Data (3 tools)
```typescript
import { createBusinessDataTools } from './tools'

const tools = createBusinessDataTools()
```

**Platforms:** Crunchbase, ZoomInfo, Yahoo Finance

### Browser Automation (14 tools)
```typescript
import { createBrowserAutomationTools } from './tools'

const tools = createBrowserAutomationTools()
```

**Capabilities:** Navigate, click, type, screenshot, scroll, ARIA snapshots, network requests

## Usage Examples

### Example 1: LinkedIn Profile Enrichment

```typescript
import { createLinkedInPersonProfileTool, createLinkedInPeopleSearchTool } from './tools'
import { anthropic_haiku } from './llms'

// Create tools
const tools = [
  createLinkedInPeopleSearchTool(), // Find profile URL
  createLinkedInPersonProfileTool(), // Get structured data
]

const model = anthropic_haiku.bindTools(tools)

// LLM will autonomously:
// 1. Search for the person
// 2. Extract the profile URL from results
// 3. Fetch structured profile data
const response = await model.invoke([
  {
    role: 'user',
    content: 'Find the LinkedIn profile for John Doe at Acme Corp and get his work experience',
  },
])
```

### Example 2: Competitive Research

```typescript
import { createSearchEngineTool, createScrapeAsMarkdownTool } from './tools'
import { anthropic_haiku } from './llms'

const tools = [
  createSearchEngineTool(),
  createScrapeAsMarkdownTool(),
]

const model = anthropic_haiku.bindTools(tools)

const response = await model.invoke([
  {
    role: 'user',
    content: `Research our top 3 competitors in the AI space. For each:
    1. Find their website
    2. Extract their product offerings
    3. Summarize their pricing`,
  },
])

// LLM will autonomously search, scrape, and summarize
```

### Example 3: Social Media Monitoring

```typescript
import { createSocialMediaTools } from './tools'
import { anthropic_haiku } from './llms'

const tools = createSocialMediaTools() // 18 social tools

const model = anthropic_haiku.bindTools(tools)

const response = await model.invoke([
  {
    role: 'user',
    content: 'Get the latest 5 posts from @company on X and Instagram. Summarize engagement.',
  },
])
```

## Cost Optimization

### Tool Cost Tiers

- **Free**: `session_stats`
- **Low**: `search_engine`, basic operations
- **Medium**: Most web data APIs (LinkedIn, e-commerce, social)
- **High**: Browser automation, batch operations, AI extraction

### Best Practices

1. **Use structured data APIs first** (LinkedIn, e-commerce) - faster and more reliable than scraping
2. **Batch operations** when possible - `scrape_batch`, `search_engine_batch`
3. **Avoid browser automation** unless necessary - high cost
4. **Cache results** in your application to minimize repeated calls

## Migration Guide

### From Brave Search → BrightData Search

```typescript
// Before (Brave Search)
import { createBraveSearchTool } from './tools'
const tool = createBraveSearchTool()

// After (BrightData MCP)
import { createSearchEngineTool } from './tools'
const tool = createSearchEngineTool() // Supports Google/Bing (better quality)
```

### From Firecrawl → BrightData Scraper

```typescript
// Before (Firecrawl)
import { createFirecrawlScraperTool } from './tools'
const tool = createFirecrawlScraperTool()

// After (BrightData MCP)
import { createScrapeAsMarkdownTool } from './tools'
const tool = createScrapeAsMarkdownTool() // Same output, one less dependency
```

### From BrightData Web Unlocker → BrightData MCP

```typescript
// Before (Direct API call)
import { createBrightdataUnlockerTool } from './tools'
const tool = createBrightdataUnlockerTool()

// After (BrightData MCP)
import { createScrapeAsMarkdownTool } from './tools'
const tool = createScrapeAsMarkdownTool() // Handles anti-bot automatically
```

## Advanced Usage

### Creating Custom Tool Definitions

```typescript
import { createMCPToolAdapter } from './tools'
import { z } from 'zod'

const myCustomTool = createMCPToolAdapter({
  name: 'web_data_custom_platform',
  description: 'Custom platform data extraction...',
  schema: z.object({
    url: z.string().url(),
  }),
  costTier: 'medium',
})
```

### Accessing MCP Client Directly

```typescript
import { getMCPClient, callMCPTool } from './tools'

// Get client
const client = await getMCPClient()

// Call tool directly (without LangChain)
const result = await callMCPTool('search_engine', {
  query: 'TypeScript',
  engine: 'google',
})
```

## Troubleshooting

### Connection Issues

```typescript
// Check client connection
import { getMCPClient } from './tools'

try {
  const client = await getMCPClient()
  console.log('MCP client connected!')
} catch (error) {
  console.error('Failed to connect:', error)
  // Check: BRIGHTDATA_API_KEY is set
  // Check: npx @brightdata/mcp is available
}
```

### Tool Call Failures

All MCP tools gracefully handle errors and return JSON error objects:

```json
{
  "error": true,
  "message": "Tool web_data_linkedin_person_profile failed: Invalid URL"
}
```

The LLM receives this error and can retry with corrected inputs.

## Performance & Limits

- **Connection**: Lazy-initialized, reused across calls
- **Timeout**: 30 seconds per tool call (configurable)
- **Rate Limiting**: Managed by BrightData MCP server
- **Concurrency**: Unlimited (managed by MCP)

## References

- [BrightData MCP GitHub](https://github.com/brightdata/brightdata-mcp)
- [BrightData MCP Documentation](https://docs.brightdata.com/api-reference/MCP-Server)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

**Questions?** See the MCP client implementation at [apps/api/src/external/mcp/](../../mcp/)
