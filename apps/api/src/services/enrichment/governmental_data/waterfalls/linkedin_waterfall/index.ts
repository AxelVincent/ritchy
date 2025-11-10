import type {
  ActivityData,
  CompanyContextData,
  PlaceContextData,
} from '../../../queries/get_officers_enrichment_context'
import type { OfficerRecord } from '../../../utils/validate_officer'
import { runLinkedInWaterfall } from './run_linkedin_waterfall'
import { runLinkedInWaterfallWithData } from './run_linkedin_waterfall_with_data'

export interface LinkedInWaterfallContext {
  readonly officerId: string
}

export interface LinkedInWaterfallWithDataContext {
  readonly officerId: string
  readonly officer: OfficerRecord
  readonly company: CompanyContextData & { activities: ActivityData[] }
  readonly place: PlaceContextData
}

export interface LinkedInWaterfallResult {
  readonly success: boolean
  readonly profileUrl?: string
  readonly confidence?: number
  readonly source?: string
}

export { runLinkedInWaterfall, runLinkedInWaterfallWithData }
