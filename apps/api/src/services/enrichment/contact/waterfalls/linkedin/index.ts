import type { EnrichmentContext } from '../../../shared/status/status_builder'
import type { OfficerRecord } from '../../../shared/utils/validate_officer'
import type {
  ActivityData,
  CompanyContextData,
  PlaceContextData,
} from '../../queries/get_officers_enrichment_context'
import { runLinkedInWaterfall } from './run_linkedin_waterfall'

export interface LinkedInWaterfallContext extends Partial<EnrichmentContext> {
  readonly officerId: string
  readonly officer: OfficerRecord
  readonly company: CompanyContextData & { activities: ActivityData[] }
  readonly place: PlaceContextData
}

export interface LinkedInResult {
  readonly profileUrl: string
  readonly confidence: number
  readonly reasoning: string
  readonly source?: string
}

export interface LinkedInWaterfallResult {
  readonly success: boolean
  readonly profileUrl?: string
  readonly confidence?: number
  readonly source?: string
}

export { runLinkedInWaterfall }
