import { logger } from '@ritchy/logger'
import { trackExternalApiCall } from '../../metrics/external-api'
import { anthropic_sonnet } from './llms'
import {
  type FilterGeneratorOutput,
  FilterGeneratorSchema,
  filterGeneratorPrompt,
} from './prompts/filter_generator'

/**
 * Generates structured filters from a natural language query using Claude.
 *
 * The LLM will:
 * 1. Parse the query and extract structured filter properties
 * 2. Route fuzzy/descriptive concepts to semanticQuery for vector search
 * 3. Provide confidence scores and explanations for each filter
 *
 * @param query - Natural language search query (e.g., "Italian restaurants in Paris with 4+ stars")
 * @returns Structured filters, optional semantic query, and reasoning
 */
export const generateFiltersFromQuery = async (
  query: string,
): Promise<FilterGeneratorOutput> => {
  logger.info({
    msg: 'Generating filters from natural language query',
    event: 'filter_generator_start',
    metadata: { query, queryLength: query.length },
  })

  try {
    const structuredOutput = anthropic_sonnet.withStructuredOutput(
      FilterGeneratorSchema,
    )

    const prompt = await filterGeneratorPrompt.invoke({ query })

    const result = await trackExternalApiCall(
      'anthropic',
      'filter_generator',
      () => structuredOutput.invoke(prompt),
    )

    logger.info({
      msg: 'Filter generation complete',
      event: 'filter_generator_result',
      metadata: {
        query,
        filterCount: result.filters.length,
        hasSemanticQuery: !!result.semanticQuery,
        semanticQuery: result.semanticQuery,
        filters: result.filters.map((f) => ({
          property: f.property,
          operator: f.operator,
          confidence: f.confidence,
        })),
      },
    })

    return result
  } catch (error) {
    logger.error({
      msg: 'Filter generation failed',
      event: 'filter_generator_error',
      metadata: {
        query,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}
