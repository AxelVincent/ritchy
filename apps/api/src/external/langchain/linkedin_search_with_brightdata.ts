import { ChatPromptTemplate } from '@langchain/core/prompts'
import { logger } from '@ritchy/logger'
import { z } from 'zod'
import { trackExternalApiCall } from '../../metrics/external-api'
import { callMCPTool } from '../brightdata/mcp/client'
import { anthropic_haiku } from './llms'

const LinkedInProfileResultSchema = z.object({
  profileUrl: z.string().url().nullable(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  matchDetails: z.object({
    nameMatch: z.boolean(),
    companyMatch: z.boolean().nullable(),
    roleMatch: z.boolean().nullable(),
    locationMatch: z.boolean().nullable(),
  }),
})

export type LinkedInProfileResult = z.infer<typeof LinkedInProfileResultSchema>

const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert at finding LinkedIn profiles from search results.

Analyze the search results and find the best matching LinkedIn profile.

Scoring:
- 90-100: Exact name + company/place match with strong evidence
- 70-89: Strong name match + company/place mentioned  
- 60-69: Name match, company/place unclear
- 0-59: No confident match

Rules:
- Only return linkedin.com/in/* profiles (personal, not company)
- Return null profileUrl if no confident match (< 60)
- Prefer matches with place/location context`,
  ],
  [
    'human',
    `Find LinkedIn profile for:
Name: {firstName} {lastName}
Company: {companyName}
Place: {placeName}
{roleInfo}

Search results:
{searchResults}`,
  ],
])

// Confidence threshold to stop searching
const HIGH_CONFIDENCE_THRESHOLD = 85

/**
 * Analyze search results and return structured profile match
 */
const analyzeResults = async (
  searchResults: string,
  person: { firstName: string; lastName: string; role?: string | null },
  companyName: string,
  placeName: string,
): Promise<LinkedInProfileResult> => {
  const chain = prompt.pipe(
    anthropic_haiku.withStructuredOutput(LinkedInProfileResultSchema),
  )

  return trackExternalApiCall('anthropic', 'linkedin_analysis', () =>
    chain.invoke({
      firstName: person.firstName,
      lastName: person.lastName,
      companyName,
      placeName,
      roleInfo: person.role ? `Role: ${person.role}` : '',
      searchResults,
    }),
  )
}

/**
 * Execute a single search query
 */
const executeQuery = async (query: string): Promise<string | null> => {
  try {
    const result = await trackExternalApiCall(
      'brightdata_mcp',
      'search_engine',
      () => callMCPTool('search_engine', { query, engine: 'google' }),
    )
    const resultStr = JSON.stringify(result, null, 2)
    return resultStr.length > 100 ? resultStr : null
  } catch (error) {
    logger.warn({
      msg: '[linkedin] Query failed',
      event: 'linkedin_query_error',
      metadata: {
        query,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    return null
  }
}

/**
 * Find LinkedIn profile URL for a person
 *
 * Strategy: Iterative search with early stopping
 * 1. Try most specific query (place name)
 * 2. Analyze immediately - if confidence ≥ 85, stop
 * 3. Otherwise, try next query and keep best result
 * 4. Return best match found
 */
export const findLinkedInProfile = async (
  person: {
    firstName: string
    lastName: string
    role?: string | null
  },
  companyName: string,
  placeName?: string,
): Promise<LinkedInProfileResult | null> => {
  const fullName = `${person.firstName} ${person.lastName}`

  logger.info({
    msg: '[linkedin] Starting search',
    event: 'linkedin_search_start',
    metadata: { fullName, companyName, placeName },
  })

  // Build queries in priority order (most specific first)
  const queries = [
    `site:linkedin.com/in/ ${person.firstName} ${person.lastName}`.trim(),
    placeName &&
      `site:linkedin.com/in/ ${person.firstName} ${person.lastName} ${placeName}`,
    companyName &&
      `site:linkedin.com/in/ ${person.firstName} ${person.lastName} ${companyName}`,
  ].filter(Boolean) as string[]

  let bestResult: LinkedInProfileResult | null = null

  try {
    for (const query of queries) {
      logger.debug({
        msg: '[linkedin] Trying query',
        event: 'linkedin_query_attempt',
        metadata: { query, currentBestConfidence: bestResult?.confidence ?? 0 },
      })

      // Execute search
      const searchResults = await executeQuery(query)
      if (!searchResults) continue

      // Analyze results
      const result = await analyzeResults(
        `Query: "${query}"\n${searchResults}`,
        person,
        companyName,
        placeName || 'N/A',
      )

      // Validate URL if present
      if (result.profileUrl) {
        const isValid =
          result.profileUrl.includes('linkedin.com/in/') &&
          !result.profileUrl.includes('linkedin.com/company/')

        if (!isValid) {
          result.profileUrl = null
          result.confidence = 0
        }
      }

      // Update best result if this is better
      if (!bestResult || result.confidence > bestResult.confidence) {
        bestResult = result

        logger.debug({
          msg: '[linkedin] New best result',
          event: 'linkedin_new_best',
          metadata: {
            query,
            confidence: result.confidence,
            hasUrl: !!result.profileUrl,
          },
        })
      }

      // Early stop if we have high confidence
      if (bestResult.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
        logger.info({
          msg: '[linkedin] High confidence match, stopping early',
          event: 'linkedin_early_stop',
          metadata: { confidence: bestResult.confidence },
        })
        break
      }
    }

    logger.info({
      msg: '[linkedin] Search complete',
      event: 'linkedin_search_complete',
      metadata: {
        fullName,
        found: !!bestResult?.profileUrl,
        confidence: bestResult?.confidence ?? 0,
      },
    })

    return bestResult
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('429') || error.message.includes('rate_limit'))
    ) {
      throw error
    }

    logger.error({
      msg: '[linkedin] Search failed',
      event: 'linkedin_search_error',
      metadata: {
        fullName,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return bestResult // Return best result so far, even on error
  }
}
