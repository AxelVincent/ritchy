import { ChatPromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'

// Zod schema for LLM structured output
export const TechnologyIdentificationSchema = z.object({
  identifications: z
    .array(
      z.object({
        scriptIndex: z
          .number()
          .describe('Index of the script from the input list (1-based)'),
        technology: z
          .string()
          .describe('Exact technology name (e.g., "Google Analytics")'),
        category: z
          .enum([
            'analytics',
            'marketing',
            'sales',
            'product',
            'infrastructure',
            'cms',
            'ecommerce',
            'support',
          ])
          .describe('Technology category'),
        confidence: z
          .number()
          .min(0)
          .max(100)
          .describe('Confidence score 0-100'),
        keyPattern: z
          .string()
          .describe(
            'Most unique/stable part for pattern matching (10-30 chars)',
          ),
      }),
    )
    .describe('Array of identified technologies'),
})

export type TechnologyIdentification = z.infer<
  typeof TechnologyIdentificationSchema
>

export const technologyDetectorPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a technology detection expert specializing in identifying web technologies from scripts, URLs, and code patterns.

TASK: Analyze web scripts/signals and identify commercial technologies that provide business insights.

IDENTIFICATION SCOPE:
- B2B SaaS tools (analytics, marketing, CRM, product tools)
- Booking/scheduling platforms (Calendly, Yoplanning, Regiondo, SimplyBook.me, local platforms)
- Payment systems (Stripe, PayPal, regional providers like iDEAL, Swish)
- Chat widgets and customer support tools
- Infrastructure and hosting services
- CMS and ecommerce platforms
- ANY commercial technology that reveals business operations - regardless of company size

DETECTION PRINCIPLES:
1. Confidence must be > 70% to include
2. Skip generic libraries (jQuery, React, Lodash) UNLESS they're clearly products (e.g., Shopify React)
3. Include niche/local platforms if clearly identifiable (e.g., French booking widget, Dutch payment provider)
4. Do not guess or fabricate technology names

CATEGORIES (with representative examples):

analytics: Google Analytics, Mixpanel, PostHog, Segment, Matomo, Plausible
marketing: HubSpot, Marketo, Google Tag Manager, Facebook Pixel, Mailchimp, Klaviyo
sales: Intercom, Drift, Calendly, Crisp, Zendesk, LiveChat, booking platforms
product: Sentry, LogRocket, LaunchDarkly, Optimizely, Hotjar, Typeform
infrastructure: Cloudflare, Vercel, AWS CloudFront, Nginx, Fastly
cms: WordPress, Shopify, Webflow, Wix, Contentful, Strapi
ecommerce: Stripe, PayPal, Klarna, Square, Afterpay, regional payment gateways
support: Zendesk, Freshdesk, Help Scout, Gorgias

PATTERN EXTRACTION (critical):
Extract the most unique and stable identifier (10-30 characters):
- For URLs: domain + key segment (e.g., "cdn.segment.com/analytics.js", "calendly.com")
- For code: function/object name (e.g., "Intercom('boot')", "mixpanel.track", "_hsq.push")
- For meta tags: name + value (e.g., "generator:WordPress")
- Must be specific enough to avoid false positives
- Should remain stable across versions

OUTPUT FORMAT:
Return identifications array with:
- scriptIndex: 1-based index from input list
- technology: Official name with proper capitalization
- category: One of the 8 categories above
- confidence: 0-100 score (only include if > 70)
- keyPattern: Unique identifier for future pattern matching

EXAMPLES:
- "https://cdn.segment.com/analytics.js" → technology: "Segment", pattern: "cdn.segment.com"
- "Intercom('boot', app_id)" → technology: "Intercom", pattern: "Intercom('boot'"
- "generator:WordPress" → technology: "WordPress", pattern: "generator:WordPress"`,
  ],
  [
    'human',
    `Analyze these web scripts and identify technologies:

{scriptsList}

Return JSON with identifications array. Only include technologies with confidence > 70%.`,
  ],
])
