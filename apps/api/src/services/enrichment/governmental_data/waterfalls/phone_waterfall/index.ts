import { runPhoneWaterfall } from './run_phone_waterfall'

export interface PhoneWaterfallContext {
  readonly officerId: string
}

export interface PhoneWaterfallResult {
  readonly success: boolean
  readonly phonesFound: number
  readonly phones: readonly string[]
  readonly providersUsed: readonly string[]
}

export { runPhoneWaterfall }
