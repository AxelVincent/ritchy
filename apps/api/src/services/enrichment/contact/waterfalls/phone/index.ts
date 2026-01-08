import type { EnrichmentContext } from '../../../shared/status/status_builder'
import { runPhoneWaterfall } from './run_phone_waterfall'

export interface PhoneWaterfallContext extends Partial<EnrichmentContext> {
  readonly officerId: string
}

export interface PhoneWaterfallResult {
  readonly success: boolean
  readonly phonesFound: number
  readonly phones: readonly string[]
  readonly providersUsed: readonly string[]
}

export { runPhoneWaterfall }
