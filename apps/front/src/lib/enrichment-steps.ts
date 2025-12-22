/**
 * User-friendly labels for enrichment steps
 */
const STEP_LABELS: Record<string, string> = {
  // Company enrichment steps
  fetching_siren: 'Looking up company registry...',
  enriching_company: 'Gathering company details...',
  scraping_website: 'Analyzing website...',
  detecting_technologies: 'Detecting technologies...',
  finding_contacts: 'Finding contact information...',
  verifying_emails: 'Verifying email addresses...',
  // Generic states
  queued: 'Waiting to start...',
  processing: 'Processing...',
  completed: 'Completed',
  failed: 'Failed',
}

/**
 * Get a user-friendly label for an enrichment step
 */
export const getStepLabel = (step: string): string => {
  const normalized = step.toLowerCase().replace(/\s+/g, '_')
  return STEP_LABELS[normalized] ?? step
}

/**
 * Weight of each step for progress calculation
 * Weights represent relative time/effort for each step
 */
const STEP_WEIGHTS: Record<string, number> = {
  fetching_siren: 5,
  enriching_company: 10,
  scraping_website: 40,
  detecting_technologies: 15,
  finding_contacts: 20,
  verifying_emails: 10,
}

const STEP_ORDER = Object.keys(STEP_WEIGHTS)
const TOTAL_WEIGHT = Object.values(STEP_WEIGHTS).reduce((a, b) => a + b, 0)

/**
 * Calculate estimated overall progress based on current step and step progress
 * This provides a more accurate progress representation to users
 */
export const getEstimatedProgress = (
  step: string,
  stepProgress: number,
): number => {
  const normalized = step.toLowerCase().replace(/\s+/g, '_')
  const currentIndex = STEP_ORDER.indexOf(normalized)

  // If step not in our known steps, just return the raw progress
  if (currentIndex === -1) return stepProgress

  // Calculate cumulative weight of completed steps
  let cumulativeWeight = 0
  for (let i = 0; i < currentIndex; i++) {
    cumulativeWeight += STEP_WEIGHTS[STEP_ORDER[i]]
  }

  // Add current step's partial progress
  const currentStepWeight = STEP_WEIGHTS[normalized] ?? 10
  const currentStepContribution = (stepProgress / 100) * currentStepWeight

  // Calculate total progress percentage
  return Math.round(
    ((cumulativeWeight + currentStepContribution) / TOTAL_WEIGHT) * 100,
  )
}
