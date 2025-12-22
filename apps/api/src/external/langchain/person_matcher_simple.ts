import { ChatPromptTemplate } from '@langchain/core/prompts'
import { logger } from '@ritchy/logger'
import { z } from 'zod'
import { trackExternalApiCall } from '../../metrics/external-api'
import type { Person } from '../icypeas/find_people'
import { anthropic_haiku } from './llms'

const PersonMatchResultSchema = z.object({
  profileUrl: z.string(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
})

const PersonMatchSchemaSimple = z.object({
  bestMatch: PersonMatchResultSchema.nullable(),
  alternatives: z.array(PersonMatchResultSchema).max(2),
})

/**
 * Simplified person matcher prompt for manual contacts (without company context)
 */
const personMatcherSimple = ChatPromptTemplate.fromMessages([
  [
    'system',
    [
      {
        type: 'text',
        text: `Match LinkedIn profiles to a person based on limited information (name and business context only).

SCORING (max 80pts):
Name (50pts): Exact match=50, Similar=40-45, Same last name=30-40, Phonetic=25-35, Nickname=15-25
Business (20pts): Business name in profile=20, Similar business=15, Same industry=10
Geography (10pts): Same city=10, region=7, country=5

CONTEXT:
- You have LIMITED information: just a name and optionally a business name
- Focus primarily on NAME matching since that's the most reliable signal
- Business name matching is secondary but helpful
- Without company data, be more conservative with confidence scores

PRIORITY:
1. Name similarity is the PRIMARY signal
2. Business context is helpful but not required
3. Geography can help disambiguate

OUTPUT RULES:
- bestMatch: Return only if confidence ≥60, otherwise null
- alternatives: Return EMPTY ARRAY [] if no good alternatives. NEVER include entries with null values
- Scoring format: "Name: X, Business: Y, Geo: Z, Total: N"`,
        cache_control: { type: 'ephemeral' },
      },
    ],
  ],
  [
    'human',
    `Person to find:
Name: {firstName} {lastName}

Business Context (if available):
Business Name: {placeName}

Search Results from Icypeas (up to 25 people):
{searchResults}

MANDATORY: Use the scoring system above. Be conservative with scores since we have limited context. Return null for bestMatch if all scores < 60.`,
  ],
])

interface SimplePersonContext {
  first_name: string
  last_name: string
}

/**
 * Simplified person matching for manual contacts.
 * Uses only name and optional place name for matching.
 */
export const matchPersonSimple = async (
  person: SimplePersonContext,
  placeName: string | null,
  searchResults: Person[],
) => {
  if (!person.first_name || !person.last_name) {
    logger.warn({
      msg: 'Person missing required name fields',
      event: 'person_match_simple_invalid_input',
      metadata: {
        hasFirstName: !!person.first_name,
        hasLastName: !!person.last_name,
      },
    })
    return {
      bestMatch: null,
      alternatives: [],
    }
  }

  if (!searchResults || searchResults.length === 0) {
    logger.debug({
      msg: 'No search results to match against',
      event: 'person_match_simple_no_results',
      metadata: { personName: `${person.first_name} ${person.last_name}` },
    })
    return {
      bestMatch: null,
      alternatives: [],
    }
  }

  logger.debug({
    msg: 'Matching person with simplified AI analysis',
    event: 'person_match_simple_start',
    metadata: {
      personName: `${person.first_name} ${person.last_name}`,
      placeName,
      resultCount: searchResults.length,
    },
  })

  const structuredOutput = anthropic_haiku.withStructuredOutput(
    PersonMatchSchemaSimple,
  )

  // Format search results for LLM
  const formattedResults = searchResults
    .map((result, index) => {
      const jobTitle = result.lastJobTitle || result.headline || 'No title'
      const companyName = result.lastCompanyName || 'No company'
      const companyInfo = result.lastCompanyWebsite
        ? `${companyName} (${result.lastCompanyWebsite})`
        : companyName
      const location =
        result.address || result.lastCompanyAddress || 'No location'
      const startDate = result.lastJobStartDate || 'Unknown'

      const fields = [
        `${index + 1}. ${result.firstname || ''} ${result.lastname || ''}`,
        `LinkedIn: ${result.profileUrl || 'N/A'}`,
        `Current: ${jobTitle} at ${companyInfo}`,
        result.lastCompanyIndustry && `Industry: ${result.lastCompanyIndustry}`,
        `Started: ${startDate}`,
        `Location: ${location}`,
        result.description &&
          `Bio: ${result.description.substring(0, 150)}${result.description.length > 150 ? '...' : ''}`,
      ].filter(Boolean)

      return fields.join('\n   ')
    })
    .join('\n\n')

  const prompt = await personMatcherSimple.invoke({
    firstName: person.first_name,
    lastName: person.last_name,
    placeName: placeName || 'Not specified',
    searchResults: formattedResults,
  })

  const result = await trackExternalApiCall(
    'openai',
    'person_matcher_simple',
    () => structuredOutput.invoke(prompt),
  )

  logger.info({
    msg: 'Simple person matching result',
    event: 'person_match_simple_result',
    metadata: {
      personName: `${person.first_name} ${person.last_name}`,
      placeName,
      bestMatch: result.bestMatch?.profileUrl,
      bestMatchConfidence: result.bestMatch?.confidence,
      alternativeCount: result.alternatives.length,
    },
  })

  return result
}
