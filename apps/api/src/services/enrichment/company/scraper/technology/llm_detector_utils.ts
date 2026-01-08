import type { ExtractedScript } from './types'

// Token optimization constants
const MAX_TOKENS_PER_BATCH = 4000 // Leave room for prompt + response
const MAX_SCRIPT_LENGTH = 250 // Truncate individual scripts
const CHARS_PER_TOKEN_ESTIMATE = 4 // Rough estimate for token counting

/**
 * Prepares scripts for LLM analysis with intelligent token budgeting
 * Selects as many scripts as possible within token limit
 * Pure function - no side effects, easy to test
 */
export const prepareScriptsForLLM = (
  scripts: ExtractedScript[],
): ExtractedScript[] => {
  const selected: ExtractedScript[] = []
  let estimatedTokens = 0

  for (const script of scripts) {
    // Truncate long script values
    const truncatedValue = script.value.slice(0, MAX_SCRIPT_LENGTH)
    const scriptTokens = Math.ceil(
      truncatedValue.length / CHARS_PER_TOKEN_ESTIMATE,
    )

    // Stop if adding this script would exceed budget
    if (estimatedTokens + scriptTokens > MAX_TOKENS_PER_BATCH) {
      break
    }

    selected.push({
      type: script.type,
      value: truncatedValue,
    })
    estimatedTokens += scriptTokens
  }

  return selected
}
