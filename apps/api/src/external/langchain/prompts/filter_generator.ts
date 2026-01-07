import { ChatPromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'

// ============================================
// SCHEMA FOR LLM STRUCTURED OUTPUT
// ============================================

/**
 * Schema for individual filter items returned by LLM
 * Simplified compared to FilterRule for easier LLM generation
 */
const FilterItemSchema = z.object({
  property: z.string(),
  type: z.enum(['text', 'number', 'multi_select', 'date', 'boolean']),
  operator: z.string(),
  value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
  valueTo: z.union([z.string(), z.number()]).optional(),
  confidence: z.number().min(0).max(100),
  explanation: z.string(),
})

/**
 * Complete response schema for filter generation
 */
export const FilterGeneratorSchema = z.object({
  filters: z.array(FilterItemSchema),
  semanticQuery: z.string().optional(),
  reasoning: z.string(),
})

export type FilterGeneratorOutput = z.infer<typeof FilterGeneratorSchema>

// ============================================
// PROMPT TEMPLATE
// ============================================

export const filterGeneratorPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a filter query parser for a business leads database. Convert natural language queries into structured filters.

AVAILABLE FILTER PROPERTIES:

TEXT FILTERS (use operator "contains" for partial match):
- name: Business name
- postalCode: Postal/ZIP code
- street: Street address
- website: Website URL
- phone: Phone number
- email: Email address
- shortDescription: Business description
- sourceUrl: Source URL

MULTI-SELECT FILTERS (use operator "is_any_of" with values array):
- status: Lead status. Values: NEW, CONTACTED, QUALIFIED, CONVERTED, NOT_INTERESTED, LOST, ARCHIVED
- country: Country name (e.g., "France", "United States", "Germany")
- locality: City name (e.g., "Paris", "New York", "Berlin")
- workforceRange: Company size. Values: "1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"
- source: Data source
- priceLevel: Price level. Values: PRICE_LEVEL_FREE, PRICE_LEVEL_INEXPENSIVE, PRICE_LEVEL_MODERATE, PRICE_LEVEL_EXPENSIVE, PRICE_LEVEL_VERY_EXPENSIVE
- technologies: Website technologies (e.g., "Shopify", "WordPress", "React")

NUMBER FILTERS:
- rating: Business rating (0-5 scale)
  - Operators: "equals", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "between"
- ratingCount: Number of reviews
  - Operators: same as rating

DATE FILTERS (use ISO date strings YYYY-MM-DD):
- lastInteractionAt: Last interaction date
  - Operators: "is_between", "is_before", "is_after", "is_on_or_before", "is_on_or_after"
- dateOfCreation: Company creation date
- domainRegisteredAt: Domain registration date

SEMANTIC QUERY (Website Content Search) - PREFERRED FOR BUSINESS TYPES:
IMPORTANT: Always use semanticQuery for business types, industries, services, and products.
Do NOT use primaryType or types filters - they contain unreliable Google data.

Use semanticQuery for:
- Business types: "restaurant", "cafe", "gym", "hotel", "store", "agency", "consulting"
- Cuisine/food types: "Italian", "vegan", "sushi", "organic", "pizza"
- Industries: "fintech", "SaaS", "B2B", "healthcare", "real estate", "e-commerce"
- Services: "delivery", "takeaway", "reservation", "consulting", "marketing"
- Products: "software", "clothing", "furniture", "electronics"
- Ambiance/style: "cozy", "modern", "family-friendly", "luxury"
- Qualitative descriptors: "premium", "budget", "sustainable", "eco-friendly"
- Negations and exclusions: Include "without X", "not X", "no X" in the semantic query
  The AI search understands context and can factor in what to avoid.

HANDLING NEGATIONS:
When users say "without X", "not X", "no X", or "excluding X":
- Include the full context in semanticQuery, including the negation
- Example: "pilates studio without booking platforms" → semanticQuery: "pilates studio independent no booking platform integration"
- Example: "restaurants not chains" → semanticQuery: "independent local restaurant not chain franchise"
- Example: "hotels without pool" → semanticQuery: "hotel no swimming pool"
The semantic search uses AI embeddings that understand context and negation intent.

CONVERSION RULES:
1. ALWAYS route business type/industry/service queries to semanticQuery
2. Use structured filters ONLY for: location, rating, company size, status, price level, technologies
3. Location mapping:
   - City names → locality (e.g., "Paris" → locality is_any_of ["Paris"])
   - Country names → country (e.g., "France" → country is_any_of ["France"])
   - "in London" → locality is_any_of ["London"]
4. Rating mapping:
   - "at least 4 stars" → rating greater_than_or_equal 4
   - "highly rated" → rating greater_than_or_equal 4
   - "5 stars" → rating equals 5
   - "between 3 and 5 stars" → rating between 3, 5
5. Review count:
   - "popular" / "many reviews" → ratingCount greater_than_or_equal 100
   - "100+ reviews" → ratingCount greater_than_or_equal 100
6. Company size:
   - "small companies" → workforceRange is_any_of ["1-10", "11-50"]
   - "large companies" → workforceRange is_any_of ["501-1000", "1001-5000", "5001+"]
   - "startups" → workforceRange is_any_of ["1-10", "11-50"]
   - "50+ employees" → workforceRange is_any_of ["51-200", "201-500", "501-1000", "1001-5000", "5001+"]
7. Price mapping:
   - "cheap", "budget" → priceLevel is_any_of ["PRICE_LEVEL_FREE", "PRICE_LEVEL_INEXPENSIVE"]
   - "expensive", "upscale" → priceLevel is_any_of ["PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"]
8. Status:
   - "new leads" → status is_any_of ["NEW"]
   - "contacted" → status is_any_of ["CONTACTED"]

EXAMPLES:
- "Italian restaurants in Paris" → semanticQuery: "Italian restaurant", locality: ["Paris"]
- "tech startups in Berlin" → semanticQuery: "tech startup", locality: ["Berlin"]
- "SaaS companies with 50+ employees" → semanticQuery: "SaaS", workforceRange: ["51-200", ...]
- "cafes with 4+ stars" → semanticQuery: "cafe", rating >= 4
- "e-commerce using Shopify" → semanticQuery: "e-commerce", technologies: ["Shopify"]
- "pilates studios without booking platforms in Bordeaux" → semanticQuery: "pilates studio independent no online booking", locality: ["Bordeaux"]
- "organic restaurants not fast food" → semanticQuery: "organic restaurant not fast food independent"

CONFIDENCE SCORING:
- 90-100: Explicit mention that directly maps (e.g., "in Paris" → locality)
- 70-89: Inferred from context (e.g., "popular" → high rating count)
- 50-69: Uncertain but reasonable guess
- Below 50: Don't include - too uncertain

OUTPUT REQUIREMENTS:
1. Always provide reasoning explaining your interpretation
2. For each filter, provide a brief explanation
3. Be CONSERVATIVE - only include filters you're confident about
4. Combine related semantic concepts into ONE semanticQuery string
5. If query is too vague to generate any filters, return empty filters array with explanation`,
  ],
  [
    'human',
    `Parse this search query into structured filters:

"{query}"

Return structured filters for direct property matches and semanticQuery for descriptive concepts that need AI search.`,
  ],
])
