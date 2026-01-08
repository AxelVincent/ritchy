import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../../db/schema'
import {
  type EnrichmentProgressStatus,
  setEnrichmentStatus,
} from './status_manager'

/**
 * Enrichment phases with allocated progress ranges
 * Ranges reflect actual time spent on each operation
 * Note: Waterfall enrichment (officer_enrichment) takes the most time
 */
export type EnrichmentPhase =
  | 'initialization' // 0-2%
  | 'website_scan' // 2-40%
  | 'company_search' // 40-45%
  | 'officer_enrichment' // 45-90%
  | 'finalization' // 90-100%

/**
 * Officer enrichment activities (generic, privacy-preserving)
 */
export type OfficerActivity =
  | 'professional_profile'
  | 'email'
  | 'phone'
  | 'verifying'

/**
 * Base enrichment context that can be added to any function signature
 * to enable optional status tracking
 */
export interface EnrichmentContext {
  userPlaceId: string
  trackStatus?: boolean
  tx?: PostgresJsDatabase<typeof schema>
}

/**
 * Progress ranges for each enrichment phase
 */
const PHASE_RANGES: Record<
  EnrichmentPhase,
  { start: number; end: number; message: string }
> = {
  initialization: {
    start: 0,
    end: 2,
    message: 'Initializing enrichment',
  },
  website_scan: {
    start: 2,
    end: 40,
    message: 'Scanning website',
  },
  company_search: {
    start: 40,
    end: 45,
    message: 'Searching company databases',
  },
  officer_enrichment: {
    start: 45,
    end: 90,
    message: 'Enriching contact information',
  },
  finalization: {
    start: 90,
    end: 100,
    message: 'Finalizing enrichment',
  },
} as const

/**
 * User-friendly activity labels (no provider/service exposure)
 */
const ACTIVITY_LABELS: Record<OfficerActivity, string> = {
  professional_profile: 'Finding professional profiles',
  email: 'Searching for contact emails',
  phone: 'Looking up phone numbers',
  verifying: 'Verifying contact information',
} as const

/**
 * Builder class for managing enrichment status updates
 * Provides structured, phase-based progress tracking with privacy-preserving messages
 */
export class EnrichmentStatusBuilder {
  private currentPhase: EnrichmentPhase | null = null

  constructor(private userPlaceId: string) {}

  /**
   * Start a new enrichment phase
   */
  async startPhase(phase: EnrichmentPhase): Promise<void> {
    this.currentPhase = phase
    const config = PHASE_RANGES[phase]

    await setEnrichmentStatus(
      this.userPlaceId,
      'processing',
      config.message,
      config.start,
    )
  }

  /**
   * Update progress within the current phase
   * @param phaseProgress - Progress percentage within the phase (0-100)
   * @param subStep - Optional detailed sub-step message
   */
  async updatePhaseProgress(
    phase: EnrichmentPhase,
    phaseProgress: number,
    subStep?: string,
  ): Promise<void> {
    const range = PHASE_RANGES[phase]
    const overallProgress =
      range.start + (phaseProgress / 100) * (range.end - range.start)

    const message = subStep || range.message

    await setEnrichmentStatus(
      this.userPlaceId,
      'processing',
      message,
      Math.round(overallProgress),
    )
  }

  /**
   * Update progress for officer enrichment activities
   * Shows generic, privacy-preserving activity messages
   *
   * Progress calculation considers both officer index and activity step:
   * - Each officer goes through 3 activities: professional_profile, email, phone
   * - Progress = (officer_index * 3 + activity_step) / (total_officers * 3) * 100
   */
  async updateOfficerProgress(
    officerIndex: number,
    totalOfficers: number,
    activity: OfficerActivity,
  ): Promise<void> {
    // Map activity to step number (0-2)
    const activitySteps: Record<OfficerActivity, number> = {
      professional_profile: 0,
      email: 1,
      phone: 2,
      verifying: 3,
    }

    const activityStep = activitySteps[activity]
    const totalSteps = totalOfficers * 3 // 3 activities per officer
    const currentStep = officerIndex * 3 + activityStep

    // Calculate phase progress (0-100 within officer_enrichment phase)
    const phaseProgress = (currentStep / totalSteps) * 100

    const activityLabel = ACTIVITY_LABELS[activity]
    const subStep = `${activityLabel} (${officerIndex + 1}/${totalOfficers})`

    await this.updatePhaseProgress('officer_enrichment', phaseProgress, subStep)
  }

  /**
   * Update with a custom activity message within a phase
   */
  async updateActivity(
    phase: EnrichmentPhase,
    activity: string,
    phaseProgress?: number,
  ): Promise<void> {
    const range = PHASE_RANGES[phase]
    const progress =
      phaseProgress !== undefined
        ? range.start + (phaseProgress / 100) * (range.end - range.start)
        : range.start

    await setEnrichmentStatus(
      this.userPlaceId,
      'processing',
      activity,
      Math.round(progress),
    )
  }

  /**
   * Mark enrichment as completed
   */
  async complete(message = 'Enrichment completed successfully'): Promise<void> {
    await setEnrichmentStatus(this.userPlaceId, 'completed', message, 100)
  }

  /**
   * Mark enrichment as failed
   */
  async fail(error: string): Promise<void> {
    await setEnrichmentStatus(this.userPlaceId, 'failed', error, 100, error)
  }

  /**
   * Set a specific status with progress
   */
  async setStatus(
    status: EnrichmentProgressStatus,
    message: string,
    progress: number,
    error?: string,
  ): Promise<void> {
    await setEnrichmentStatus(
      this.userPlaceId,
      status,
      message,
      progress,
      error,
    )
  }
}

/**
 * Helper to create a status manager from context if tracking is enabled
 */
export const createStatusManager = (
  context: EnrichmentContext,
): EnrichmentStatusBuilder | null => {
  return context.trackStatus
    ? new EnrichmentStatusBuilder(context.userPlaceId)
    : null
}
