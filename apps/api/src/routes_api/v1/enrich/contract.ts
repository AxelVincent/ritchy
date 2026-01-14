import { z } from 'zod'
import { PreferredPlaceSchema } from '../../../external/google_maps/types'
import { GeometryLocationSchema } from '../../../shared/google-maps'

// ============================================================================
// Request Schema
// ============================================================================

/**
 * Request schema for POST /api/v1/enrich/company
 * Accepts either a Google Place ID or a Google Maps URL
 */
export const EnrichCompanyRequestSchema = z
  .object({
    googlePlaceId: z.string().optional(),
    googleMapsUrl: z.string().url().optional(),
  })
  .refine(
    (data) => {
      const hasPlaceId = !!data.googlePlaceId
      const hasMapsUrl = !!data.googleMapsUrl
      return (hasPlaceId && !hasMapsUrl) || (!hasPlaceId && hasMapsUrl)
    },
    {
      message: 'Provide exactly one of: googlePlaceId or googleMapsUrl',
    },
  )

export type EnrichCompanyRequest = z.infer<typeof EnrichCompanyRequestSchema>

// ============================================================================
// Response Sub-Schemas
// ============================================================================

// --- Reusable Address Schema ---
const AddressSchema = z.object({
  addressLine1: z.string().nullable().describe('Primary street address'),
  addressLine2: z
    .string()
    .nullable()
    .describe('Secondary address line (suite, floor, etc.)'),
  postalCode: z.string().nullable().describe('Postal or ZIP code'),
  city: z.string().nullable().describe('City name'),
  country: z.string().nullable().describe('Country name'),
  countryCode: z
    .string()
    .nullable()
    .describe('ISO 3166-1 alpha-2 country code (e.g., "FR", "US")'),
})

// --- Website Data (from scraping) ---
const WebsiteEmailSchema = z.object({
  email: z.string().describe('Email address found on the website'),
  type: z
    .enum(['generic', 'role', 'personal'])
    .describe(
      'Email classification: generic (info@), role-based (sales@), or personal',
    ),
})

const SocialsSchema = z.object({
  linkedin: z.string().nullable().describe('LinkedIn company page URL'),
  facebook: z.string().nullable().describe('Facebook page URL'),
  instagram: z.string().nullable().describe('Instagram profile URL'),
})

const WebsiteDataSchema = z.object({
  domain: z
    .string()
    .nullable()
    .describe('Primary domain name (e.g., "example.com")'),
  title: z
    .string()
    .nullable()
    .describe('Website page title from HTML <title> tag'),
  description: z.string().nullable().describe('Website meta description'),
  shortDescription: z
    .string()
    .nullable()
    .describe('AI-generated short description of the business'),
  domainRegisteredAt: z
    .string()
    .nullable()
    .describe('Domain registration date (ISO 8601)'),
  emails: z
    .array(WebsiteEmailSchema)
    .describe('List of email addresses found on the website'),
  socials: SocialsSchema.describe('Social media profile URLs'),
  technologies: z
    .array(z.string())
    .describe(
      'Technologies detected on the website (e.g., React, Stripe, WordPress)',
    ),
})

// --- Registry Data (from government sources) ---
const CommercialRegisterSchema = z.object({
  status: z.string().nullable().describe('Status in the commercial register'),
  location: z
    .string()
    .nullable()
    .describe('Location of the commercial register'),
  registrationDate: z
    .string()
    .nullable()
    .describe('Date of registration (ISO 8601)'),
  cessationDate: z
    .string()
    .nullable()
    .describe('Date of cessation if applicable (ISO 8601)'),
})

const ActivitySchema = z.object({
  code: z.string().nullable().describe('Activity code (e.g., NACE code)'),
  name: z.string().nullable().describe('Activity description'),
  type: z
    .enum(['standard', 'local'])
    .describe('Classification type: standard (NACE) or local country-specific'),
  classification: z
    .string()
    .nullable()
    .describe('Classification system name (for local types)'),
})

const EstablishmentAddressSchema = z.object({
  addressLine1: z.string().nullable().describe('Primary street address'),
  addressLine2: z.string().nullable().describe('Secondary address line'),
  postalCode: z.string().nullable().describe('Postal or ZIP code'),
  city: z.string().nullable().describe('City name'),
  country: z.string().nullable().describe('Country name'),
  countryCode: z
    .string()
    .nullable()
    .describe('ISO 3166-1 alpha-2 country code'),
})

const EstablishmentSchema = z.object({
  number: z.string().nullable().describe('Establishment identifier number'),
  name: z.string().nullable().describe('Establishment name'),
  tradeName: z
    .string()
    .nullable()
    .describe('Trade name or doing business as (DBA)'),
  acronym: z.string().nullable().describe('Establishment acronym'),
  status: z
    .string()
    .nullable()
    .describe('Current status (active, closed, etc.)'),
  createdAt: z.string().nullable().describe('Creation date (ISO 8601)'),
  cessationDate: z
    .string()
    .nullable()
    .describe('Closure date if applicable (ISO 8601)'),
  fieldsOfActivity: z
    .string()
    .nullable()
    .describe('Description of business activities'),
  address: EstablishmentAddressSchema.nullable().describe(
    'Physical address of the establishment',
  ),
})

const FinancialRatiosSchema = z.object({
  // Income Statement
  turnover: z
    .number()
    .nullable()
    .describe('Total revenue/sales for the period'),
  grossProfit: z
    .number()
    .nullable()
    .describe('Revenue minus cost of goods sold'),
  ebitda: z
    .number()
    .nullable()
    .describe(
      'Earnings before interest, taxes, depreciation, and amortization',
    ),
  operatingProfit: z
    .number()
    .nullable()
    .describe('Profit from core business operations'),
  netIncome: z
    .number()
    .nullable()
    .describe('Final profit after all expenses and taxes'),
  exportTurnover: z.number().nullable().describe('Revenue from export sales'),

  // Profitability Margins
  revenueGrowthRate: z
    .number()
    .nullable()
    .describe('Year-over-year revenue growth rate (%)'),
  grossMarginRate: z
    .number()
    .nullable()
    .describe('Gross profit as percentage of revenue'),
  ebitdaMargin: z
    .number()
    .nullable()
    .describe('EBITDA as percentage of revenue'),
  ebitMargin: z.number().nullable().describe('EBIT as percentage of revenue'),
  netMargin: z
    .number()
    .nullable()
    .describe('Net income as percentage of revenue'),
  valueAddedRatio: z
    .number()
    .nullable()
    .describe('Value added as percentage of revenue'),

  // Working Capital
  workingCapitalRequirements: z
    .number()
    .nullable()
    .describe('Capital needed to fund day-to-day operations'),
  daySalesOutstanding: z
    .number()
    .nullable()
    .describe('Average days to collect receivables'),
  daysPayableOutstanding: z
    .number()
    .nullable()
    .describe('Average days to pay suppliers'),
  netWorkingCapital: z
    .number()
    .nullable()
    .describe('Current assets minus current liabilities'),

  // Cash Flow
  cashFlowFromOperations: z
    .number()
    .nullable()
    .describe('Cash generated from operating activities'),
  cash: z.number().nullable().describe('Total cash and cash equivalents'),

  // Debt & Leverage
  financialDebt: z
    .number()
    .nullable()
    .describe('Total financial debt (loans, bonds, etc.)'),
  netFinancialDebt: z.number().nullable().describe('Financial debt minus cash'),
  capitalDebtRepaymentCapacity: z
    .number()
    .nullable()
    .describe('Ability to repay debt from operations'),
  gearingRatio: z.number().nullable().describe('Debt to equity ratio'),
  leverageRatio: z.number().nullable().describe('Total assets to equity ratio'),
  debtsPayableWithinOneYear: z
    .number()
    .nullable()
    .describe('Short-term debt obligations'),
  debtCoverageRatio: z
    .number()
    .nullable()
    .describe('Operating income to debt service'),

  // Equity & Returns
  equity: z.number().nullable().describe('Total shareholders equity'),
  returnOnEquity: z
    .number()
    .nullable()
    .describe('Net income as percentage of equity (ROE)'),
})

const RelatedDocumentSchema = z.object({
  type: z
    .string()
    .nullable()
    .describe('Document type (e.g., annual report, balance sheet)'),
  date: z.string().nullable().describe('Document date (ISO 8601)'),
  description: z.string().nullable().describe('Document description'),
  fileAvailable: z
    .boolean()
    .nullable()
    .describe('Whether the file can be downloaded'),
  fileFormat: z.string().nullable().describe('File format (e.g., PDF)'),
})

const FinancialSchema = z.object({
  type: z.string().nullable().describe('Type of financial statement'),
  startDate: z
    .string()
    .nullable()
    .describe('Fiscal period start date (ISO 8601)'),
  endDate: z.string().nullable().describe('Fiscal period end date (ISO 8601)'),
  depositDate: z
    .string()
    .nullable()
    .describe('Date the financial statement was filed (ISO 8601)'),
  currency: z.string().nullable().describe('Currency code (e.g., EUR, USD)'),
  availability: z.string().nullable().describe('Data availability status'),
  ratios: FinancialRatiosSchema.nullable().describe(
    'Financial ratios and metrics',
  ),
  relatedDocuments: z
    .array(RelatedDocumentSchema)
    .nullable()
    .describe('Related financial documents'),
})

const UboAddressSchema = z.object({
  addressLine1: z.string().nullable().describe('Primary street address'),
  addressLine2: z.string().nullable().describe('Secondary address line'),
  postalCode: z.string().nullable().describe('Postal or ZIP code'),
  city: z.string().nullable().describe('City name'),
  country: z.string().nullable().describe('Country name'),
  countryCode: z
    .string()
    .nullable()
    .describe('ISO 3166-1 alpha-2 country code'),
})

const UboSchema = z.object({
  firstName: z
    .string()
    .nullable()
    .describe('First name of the beneficial owner'),
  lastName: z.string().nullable().describe('Last name of the beneficial owner'),
  gender: z.string().nullable().describe('Gender (male, female, other)'),
  dateOfBirth: z.string().nullable().describe('Date of birth (ISO 8601)'),
  nationality: z.string().nullable().describe('Nationality'),
  nationalityCode: z
    .string()
    .nullable()
    .describe('ISO 3166-1 alpha-2 nationality code'),
  percentageOfShares: z
    .string()
    .nullable()
    .describe('Percentage of shares owned'),
  votingPercentage: z
    .string()
    .nullable()
    .describe('Percentage of voting rights'),
  address: UboAddressSchema.nullable().describe(
    'Address of the beneficial owner',
  ),
})

const OfficerAddressSchema = z.object({
  addressLine1: z.string().nullable().describe('Primary street address'),
  addressLine2: z.string().nullable().describe('Secondary address line'),
  postalCode: z.string().nullable().describe('Postal or ZIP code'),
  city: z.string().nullable().describe('City name'),
  country: z.string().nullable().describe('Country name'),
  countryCode: z
    .string()
    .nullable()
    .describe('ISO 3166-1 alpha-2 country code'),
})

const OfficerSchema = z.object({
  type: z
    .enum(['physical', 'legal'])
    .nullable()
    .describe('Officer type: physical (person) or legal (company)'),
  role: z
    .string()
    .nullable()
    .describe('Position or role (e.g., CEO, Director, Manager)'),
  mention: z
    .string()
    .nullable()
    .describe('Additional information about the officer'),
  appointmentDate: z
    .string()
    .nullable()
    .describe('Date of appointment (ISO 8601)'),

  // Personal info (for physical persons)
  firstName: z
    .string()
    .nullable()
    .describe('First name (for physical persons)'),
  lastName: z.string().nullable().describe('Last name (for physical persons)'),
  gender: z.string().nullable().describe('Gender (for physical persons)'),
  dateOfBirth: z
    .string()
    .nullable()
    .describe('Date of birth (ISO 8601, for physical persons)'),
  nationality: z
    .string()
    .nullable()
    .describe('Nationality (for physical persons)'),
  nationalityCode: z
    .string()
    .nullable()
    .describe('ISO nationality code (for physical persons)'),

  // Company info (for legal persons)
  companyName: z
    .string()
    .nullable()
    .describe('Company name (for legal person officers)'),
  companyNumber: z
    .string()
    .nullable()
    .describe('Company registration number (for legal person officers)'),

  // Address
  address: OfficerAddressSchema.nullable().describe('Address of the officer'),
})

const RegistryDataSchema = z.object({
  // Identifiers
  registrationNumber: z
    .string()
    .describe('Official company registration number'),
  countryCode: z.string().describe('ISO 3166-1 alpha-2 country code'),
  country: z.string().nullable().describe('Country name'),
  state: z.string().nullable().describe('State or region'),
  lei: z
    .string()
    .nullable()
    .describe('Legal Entity Identifier (LEI) - 20-character code'),
  isin: z
    .string()
    .nullable()
    .describe('International Securities Identification Number'),
  vatNumber: z.string().nullable().describe('VAT registration number'),

  // Names
  name: z.string().describe('Official registered company name'),
  tradeName: z
    .string()
    .nullable()
    .describe('Trading name or doing business as (DBA)'),
  acronym: z.string().nullable().describe('Company acronym'),

  // Legal structure
  legalFormCode: z
    .string()
    .nullable()
    .describe('Legal form code (e.g., LLC, SA, GmbH)'),
  localLegalFormCode: z
    .string()
    .nullable()
    .describe('Country-specific legal form code'),
  localLegalFormName: z
    .string()
    .nullable()
    .describe('Country-specific legal form name'),
  type: z.string().nullable().describe('Company type classification'),

  // Status & dates
  status: z
    .string()
    .describe('Current company status (active, dissolved, etc.)'),
  createdAt: z
    .string()
    .nullable()
    .describe('Company creation/registration date (ISO 8601)'),
  cessationDate: z
    .string()
    .nullable()
    .describe('Company cessation date if applicable (ISO 8601)'),

  // Workforce
  workforce: z.number().nullable().describe('Number of employees'),
  workforceRange: z
    .string()
    .nullable()
    .describe('Employee count range (e.g., "50-100")'),

  // Head office
  headOffice: AddressSchema.nullable().describe('Head office address'),

  // Commercial register
  commercialRegister: CommercialRegisterSchema.nullable().describe(
    'Commercial register information',
  ),

  // Financial info
  shareCapital: z.string().nullable().describe('Share capital amount'),
  shareCapitalCurrency: z
    .string()
    .nullable()
    .describe('Share capital currency code'),
  fiscalYearEnd: z.string().nullable().describe('Fiscal year end date'),
  fieldsOfActivity: z
    .string()
    .nullable()
    .describe('Description of business activities'),

  // Related data
  activities: z
    .array(ActivitySchema)
    .describe('Business activity codes (NACE, local classifications)'),
  establishments: z
    .array(EstablishmentSchema)
    .describe('Company establishments/branches'),
  financials: z.array(FinancialSchema).describe('Annual financial statements'),
  ubos: z.array(UboSchema).describe('Ultimate Beneficial Owners (UBOs)'),
  officers: z.array(OfficerSchema).describe('Company directors and officers'),
})

// ============================================================================
// Company Match Schema (confidence in place-to-company association)
// ============================================================================

const CompanyMatchSchema = z.object({
  confidenceScore: z
    .number()
    .nullable()
    .describe(
      'Confidence score (0-100) that this is the correct company match',
    ),
  reasoning: z
    .string()
    .nullable()
    .describe('AI-generated explanation of why this company was matched'),
})

// ============================================================================
// Main Response Schema
// ============================================================================

export const ApiV1CompanyEnrichmentDataSchema = z.object({
  // Quick access (from Google Maps)
  googlePlaceId: z.string().describe('Unique Google Place identifier'),
  name: z.string().nullable().describe('Business name from Google Maps'),
  formattedAddress: z.string().nullable().describe('Full formatted address'),
  phone: z.string().nullable().describe('International phone number'),
  websiteUrl: z.string().nullable().describe('Business website URL'),
  rating: z.number().nullable().describe('Google Maps rating (1-5 stars)'),
  reviewCount: z.number().nullable().describe('Number of Google reviews'),
  location: GeometryLocationSchema.nullable().describe(
    'Geographic coordinates (lat/lng)',
  ),

  // Full Google Place data
  googlePlace: PreferredPlaceSchema.nullable().describe(
    'Complete Google Place data from Google Maps API',
  ),

  // Website scraping data
  website: WebsiteDataSchema.nullable().describe(
    'Data extracted from the company website',
  ),

  // Registry data
  registry: RegistryDataSchema.nullable().describe(
    'Official company registry data from government sources',
  ),

  // Company match confidence (how confident we are this is the right company)
  companyMatch: CompanyMatchSchema.nullable().describe(
    'Confidence score and reasoning for the company match',
  ),

  // Enrichment quality
  enrichmentScore: z
    .number()
    .nullable()
    .describe('Overall data quality score (0-100)'),
})

export type ApiV1CompanyEnrichmentData = z.infer<
  typeof ApiV1CompanyEnrichmentDataSchema
>

// ============================================================================
// API Response Wrappers
// ============================================================================

const ApiV1MetaSchema = z.object({
  requestId: z.string(),
  processingTimeMs: z.number(),
  creditsUsed: z.number(),
  creditsRemaining: z.number(),
})

export const ApiV1CompanyEnrichmentSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: ApiV1CompanyEnrichmentDataSchema,
  meta: ApiV1MetaSchema,
})

export type ApiV1CompanyEnrichmentSuccessResponse = z.infer<
  typeof ApiV1CompanyEnrichmentSuccessResponseSchema
>

export const ApiV1ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  meta: z.object({
    requestId: z.string(),
    processingTimeMs: z.number(),
  }),
})

export type ApiV1ErrorResponse = z.infer<typeof ApiV1ErrorResponseSchema>

// ============================================================================
// Export Sub-Schemas for Testing/Reuse
// ============================================================================

export {
  AddressSchema as ApiV1AddressSchema,
  WebsiteDataSchema as ApiV1WebsiteDataSchema,
  RegistryDataSchema as ApiV1RegistryDataSchema,
  OfficerSchema as ApiV1OfficerSchema,
  UboSchema as ApiV1UboSchema,
  FinancialSchema as ApiV1FinancialSchema,
  EstablishmentSchema as ApiV1EstablishmentSchema,
  ActivitySchema as ApiV1ActivitySchema,
  FinancialRatiosSchema as ApiV1FinancialRatiosSchema,
  SocialsSchema as ApiV1SocialsSchema,
  WebsiteEmailSchema as ApiV1WebsiteEmailSchema,
}
