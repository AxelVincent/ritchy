import type { EnrichResponseData } from '@ritchy/types'

export interface WebsiteAnalyzerRequestParams {
  url: string
}

export type WebsiteAnalyzerResult = EnrichResponseData & {
  error?: string
  _metadata?: {
    crawled_urls: string[]
    final_step: string
    loop_cycles: number
    token_reporting: string
    tool_calls: number
    total_cost: number
    total_tokens: number
  }
}
