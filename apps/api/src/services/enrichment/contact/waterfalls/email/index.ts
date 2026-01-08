import type { EnrichmentContext } from '../../../shared/status/status_builder'
import type { OfficerRecord } from '../../../shared/utils/validate_officer'
import { runEmailWaterfall } from './run_email_waterfall'
import { runEmailWaterfallWithData } from './run_email_waterfall_with_data'

export interface EmailWaterfallContext extends Partial<EnrichmentContext> {
  readonly officerId: string
}

export interface EmailWaterfallWithDataContext
  extends Partial<EnrichmentContext> {
  readonly officerId: string
  readonly officer: OfficerRecord
  readonly website: string | null
}

export { runEmailWaterfall, runEmailWaterfallWithData }
