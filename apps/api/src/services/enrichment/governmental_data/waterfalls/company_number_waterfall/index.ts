import type { Place } from '../../../../../db/schema'
import { runCompanyNumberWaterfall } from './run_company_number_waterfall'

export interface CompanyNumberWaterfallContext {
  readonly place: Place
  readonly countryCode: string
}

export interface CompanyNumberResult {
  readonly companyNumber: string
  readonly confidence: number
  readonly reasoning: string
  readonly sources?: Array<{
    readonly url: string
    readonly isOfficial?: boolean
  }>
}

export { runCompanyNumberWaterfall }
