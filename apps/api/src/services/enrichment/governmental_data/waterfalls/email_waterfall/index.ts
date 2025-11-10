import type { OfficerRecord } from '../../../utils/validate_officer'
import { runEmailWaterfall } from './run_email_waterfall'
import { runEmailWaterfallWithData } from './run_email_waterfall_with_data'

export interface EmailWaterfallContext {
  readonly officerId: string
}

export interface EmailWaterfallWithDataContext {
  readonly officerId: string
  readonly officer: OfficerRecord
  readonly website: string | null
}

export { runEmailWaterfall, runEmailWaterfallWithData }
