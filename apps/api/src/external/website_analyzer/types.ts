import type {
  BusinessInfo,
  ContactInfo,
  EnrichResponseData,
  Metadata,
  ProductsServices,
  SocialNetworks,
  TargetCustomers,
} from '@ritchy/types'

export interface WebsiteAnalyzerRequestParams {
  url: string
}

export type WebsiteAnalyzerResult = EnrichResponseData & {
  error?: string
  _metadata?: Metadata
}

// Export individual types for direct use
export type {
  BusinessInfo,
  ProductsServices,
  TargetCustomers,
  ContactInfo,
  SocialNetworks,
  Metadata,
}
