import { logger } from '@ritchy/logger'
import { gemini_2_5_flash } from '../../../../../external/langchain/llms'
import {
  TechnologyIdentificationSchema,
  technologyDetectorPrompt,
} from '../../../../../external/langchain/prompts/technology_detector'
import { retryWithBackoff } from '../../../../../utils/retry_with_backoff'
import { prepareScriptsForLLM } from './llm_detector_utils'
import type { ExtractedScript, LLMIdentification } from './types'

/**
 * Uses LangChain + Gemini 2.5 Flash to identify technologies from unmatched scripts
 * Optimizes token usage with intelligent batching and truncation
 * Includes retry logic with exponential backoff for resilience
 */
export const identifyScriptsBatch = async (
  scripts: ExtractedScript[],
): Promise<LLMIdentification[]> => {
  if (scripts.length === 0) {
    return []
  }

  const startTime = Date.now()

  // Prepare scripts with token optimization
  const scriptsToAnalyze = prepareScriptsForLLM(scripts)

  if (scriptsToAnalyze.length === 0) {
    logger.warn({
      msg: '[Technology Detection] No scripts fit within token budget',
      event: 'llm_no_scripts_in_budget',
      metadata: { originalCount: scripts.length },
    })
    return []
  }

  // Format scripts for prompt
  const scriptsList = scriptsToAnalyze
    .map((s, i) => `${i + 1}. [${s.type}] ${s.value}`)
    .join('\n\n')

  try {
    // Execute LLM call with retry logic
    const result = await retryWithBackoff(
      async () => {
        // Create structured output with Zod schema
        const structuredOutput = gemini_2_5_flash.withStructuredOutput(
          TechnologyIdentificationSchema,
        )

        // Invoke prompt
        const prompt = await technologyDetectorPrompt.invoke({
          scriptsList,
        })

        // Get structured response
        return await structuredOutput.invoke(prompt)
      },
      {
        maxAttempts: 3,
        initialBackoffMs: 1000,
        context: 'Technology Detection LLM',
      },
    )

    // Map to our internal format
    const identifications: LLMIdentification[] = result.identifications.map(
      (r) => {
        const script = scriptsToAnalyze[r.scriptIndex - 1]

        return {
          technology: r.technology,
          category: r.category,
          confidence: r.confidence,
          evidence: script?.value || '',
          keyPattern: r.keyPattern,
        }
      },
    )

    const llmTime = Date.now() - startTime

    logger.debug({
      msg: `[Technology Detection] LLM identified ${identifications.length} technologies in ${llmTime}ms`,
      event: 'llm_detection_complete',
      metadata: {
        scriptsProvided: scripts.length,
        scriptsAnalyzed: scriptsToAnalyze.length,
        identified: identifications.length,
        llmTimeMs: llmTime,
        technologies: identifications.map((i) => i.technology),
        model: 'gemini-2.5-flash',
      },
    })

    return identifications
  } catch (error) {
    logger.error({
      msg: '[Technology Detection] Error during LLM detection after retries',
      event: 'llm_detection_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        scriptsCount: scriptsToAnalyze.length,
        retriesAttempted: 3,
      },
    })

    return []
  }
}
