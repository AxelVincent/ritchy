import { logger } from '@ritchy/logger'
import { getSharedVectorStore } from '../../../external/langchain/utils/vector_store'

export interface SemanticSearchOptions {
  query: string
  domains: string[] // Only search within these domains (user's places)
  threshold?: number // Default 0.4 - minimum cosine similarity (-1 to 1, higher = more similar)
}

export interface SemanticDomainMatch {
  domain: string
  score: number
  sampleContent?: string
}

/**
 * Performs semantic search across indexed website content.
 * Only searches within the provided domains (user's places).
 *
 * @param options - Search options including query, domains to search, and threshold
 * @returns Array of domain matches with relevance scores
 */
export const semanticSearchDomains = async (
  options: SemanticSearchOptions,
): Promise<SemanticDomainMatch[]> => {
  const { query, domains, threshold = 0.5 } = options

  // If no domains provided, return empty
  if (domains.length === 0) {
    logger.debug({
      msg: '[semantic_search] Skipped - no domains provided',
      event: 'semantic_search_no_domains',
      metadata: { query },
    })
    return []
  }

  logger.info({
    msg: '[semantic_search] Starting domain search',
    event: 'semantic_search_start',
    metadata: {
      query,
      threshold,
      domainCount: domains.length,
      sampleDomains: domains.slice(0, 5),
    },
  })

  try {
    const vectorStore = await getSharedVectorStore()

    // Build Qdrant filter to only search within user's domains
    // Using 'should' with match for each domain (OR logic within domains)
    // Format: https://qdrant.tech/documentation/concepts/filtering/
    const domainFilter = {
      should: domains.map((domain) => ({
        key: 'metadata.domain',
        match: { value: domain },
      })),
    }

    // Use similaritySearchWithScore to get relevance scores
    // Limit results - we don't need more than a few matches per domain
    const maxResultsPerDomain = 3
    const maxTotalResults = Math.min(domains.length * maxResultsPerDomain, 500)

    const results = await vectorStore.similaritySearchWithScore(
      query,
      maxTotalResults,
      domainFilter,
    )

    // Log all unique domains found in results for debugging
    const foundDomains = new Set(results.map(([doc]) => doc.metadata?.domain))
    const missingDomains = domains.filter((d) => !foundDomains.has(d))

    logger.debug({
      msg: '[semantic_search] Raw results from Qdrant',
      event: 'semantic_search_raw_results',
      metadata: {
        query,
        resultCount: results.length,
        uniqueDomainsFound: foundDomains.size,
        sampleScores: results.slice(0, 10).map(([doc, score]) => ({
          domain: doc.metadata?.domain,
          score: score.toFixed(4),
        })),
        // Domains that were searched but had NO results in Qdrant
        missingFromQdrant: missingDomains.slice(0, 20),
        missingCount: missingDomains.length,
      },
    })

    // Group by domain and take highest score (best match) per domain
    // Qdrant returns cosine SIMILARITY scores (higher = more similar, range -1 to 1)
    const domainScores = new Map<string, { score: number; content: string }>()
    const belowThreshold = new Map<string, number>() // Track domains filtered by threshold

    for (const [doc, score] of results) {
      const domain = doc.metadata?.domain as string | undefined
      if (!domain) continue

      // Only include if score is above threshold (more similar)
      // Score: 1 = identical, 0 = orthogonal, -1 = opposite
      if (score < threshold) {
        // Track the best score for domains that didn't meet threshold
        const existing = belowThreshold.get(domain)
        if (!existing || score > existing) {
          belowThreshold.set(domain, score)
        }
        continue
      }

      const existing = domainScores.get(domain)
      if (!existing || score > existing.score) {
        domainScores.set(domain, {
          score,
          content: doc.pageContent.substring(0, 200),
        })
      }
    }

    // Log domains that had results but were filtered by threshold
    if (belowThreshold.size > 0) {
      logger.debug({
        msg: '[semantic_search] Domains filtered by threshold',
        event: 'semantic_search_below_threshold',
        metadata: {
          query,
          threshold,
          filteredDomains: Array.from(belowThreshold.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([domain, score]) => ({ domain, score: score.toFixed(4) })),
          filteredCount: belowThreshold.size,
        },
      })
    }

    // Already have similarity scores from Qdrant
    const matches: SemanticDomainMatch[] = Array.from(domainScores.entries())
      .map(([domain, { score, content }]) => ({
        domain,
        score,
        sampleContent: content,
      }))
      .sort((a, b) => b.score - a.score)

    logger.info({
      msg: '[semantic_search] Completed',
      event: 'semantic_search_complete',
      metadata: {
        query,
        threshold,
        inputDomainCount: domains.length,
        matchCount: matches.length,
        topMatches: matches.slice(0, 5).map((m) => ({
          domain: m.domain,
          score: m.score.toFixed(3),
        })),
      },
    })

    return matches
  } catch (error) {
    logger.error({
      msg: '[semantic_search] Failed',
      event: 'semantic_search_error',
      metadata: {
        query,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}
