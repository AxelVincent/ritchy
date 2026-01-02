import { logger } from '@ritchy/logger'

import { ContactTypeEnum } from '@ritchy/types'
import z from 'zod'
import { PAPPERS_CONFIG } from '../../config/pappers'
import {
  createSimpleDurationTimer,
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'

export const PAPPERS_COUNTRY_CODES = z.enum([
  'UK',
  'FR',
  'BE',
  'CH',
  'NL',
  'LU',
  'DE',
  'ES',
])

const AddressSchema = z.object({
  address_line_1: z.string().nullable(),
  address_line_2: z.string().nullable(),
  postal_code: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  country_code: z.string().nullable(),
})

const ActivitySchema = z.object({
  code: z.string().nullable(),
  name: z.string().nullable(),
})

const LocalActivitySchema = z.object({
  code: z.string().nullable(),
  name: z.string().nullable(),
  classification: z.string().nullable(),
})

const CompanyReferenceSchema = z.object({
  company_number: z.string().nullable(),
  name: z.string().nullable(),
})

const OfficerSchema = z.object({
  type: ContactTypeEnum.nullable(),
  role: z.string().nullable(),
  mention: z.string().nullable().optional(),
  date_of_appointment: z.string().nullable(),
  last_name: z.string().nullable(),
  first_name: z.string().nullable(),
  gender: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  date_of_birth_format: z.string().nullable(),
  nationality: z.string().nullable(),
  nationality_code: z.string().nullable(),
  company_name: z.string().nullable(),
  company_number: z.string().nullable(),
  address_line_1: z.string().nullable(),
  address_line_2: z.string().nullable(),
  postal_code: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  country_code: z.string().nullable(),
  companies: z.array(CompanyReferenceSchema).nullable().optional(), // Deprecated
})

const UboSchema = z.object({
  last_name: z.string().nullable(),
  first_name: z.string().nullable(),
  gender: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  date_of_birth_format: z.string().nullable(),
  nationality: z.string().nullable(),
  nationality_code: z.string().nullable(),
  address_line_1: z.string().nullable(),
  address_line_2: z.string().nullable(),
  postal_code: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  country_code: z.string().nullable(),
  percentage_of_shares: z.string().nullable(),
  voting_percentage: z.string().nullable(),
})

const FinancialRatiosSchema = z.object({
  turnover: z.number().nullable(),
  gross_profit: z.number().nullable(),
  ebitda: z.number().nullable(),
  operating_profit: z.number().nullable(),
  net_income: z.number().nullable(),
  revenue_growth_rate: z.number().nullable(),
  gross_margin_rate: z.number().nullable(),
  ebitda_margin: z.number().nullable(),
  ebit_margin: z.number().nullable(),
  working_capital_requirements: z.number().nullable(),
  day_sales_outstanding: z.number().nullable(),
  days_payable_outstanding: z.number().nullable(),
  cash_flow_from_operations: z.number().nullable(),
  net_working_capital: z.number().nullable(),
  cash: z.number().nullable(),
  financial_debt: z.number().nullable(),
  net_financial_debt: z.number().nullable(),
  capital_debt_repayment_capacity: z.number().nullable(),
  gearing_ratio: z.number().nullable(),
  leverage_ratio: z.number().nullable(),
  debts_payable_within_one_year: z.number().nullable(),
  debt_coverage_ratio: z.number().nullable(),
  equity: z.number().nullable(),
  net_margin: z.number().nullable(),
  return_on_equity: z.number().nullable(),
  value_added_ratio: z.number().nullable(),
  export_turnover: z.number().nullable(),
})
export type FinancialRatios = z.infer<typeof FinancialRatiosSchema>

const RelatedDocumentSchema = z.object({
  type: z.string().nullable(),
  date: z.string().nullable(),
  file_available: z.boolean().nullable(),
  description: z.string().nullable(),
  file_token: z.string().nullable(),
  file_format: z.string().nullable(),
})
export type RelatedDocument = z.infer<typeof RelatedDocumentSchema>

const FinancialSchema = z.object({
  type: z.string().nullable(),
  financials_start_date: z.string().nullable(),
  financials_end_date: z.string().nullable(),
  deposit_date: z.string().nullable(),
  currency: z.string().nullable(),
  availability: z.string().nullable(),
  ratios: FinancialRatiosSchema.nullable(),
  related_documents: z.array(RelatedDocumentSchema).nullable(),
})

const DocumentSchema = z.object({
  mentions: z.array(z.string()).nullable(),
  type: z.string().nullable(),
  date: z.string().nullable(),
  file_available: z.boolean().nullable(),
  description: z.string().nullable(),
  file_token: z.string().nullable(),
  file_format: z.string().nullable(),
  company: CompanyReferenceSchema.nullable(),
})

const CertificateSchema = z.object({
  type: z.string().nullable(),
  date: z.string().nullable(),
  file_available: z.boolean().nullable(),
  description: z.string().nullable(),
  file_token: z.string().nullable(),
  file_format: z.string().nullable(),
})

const PublicationSchema = z.object({
  mentions: z.array(z.string()).nullable(),
  type: z.string().nullable(),
  date: z.string().nullable(),
  source: z.string().nullable(),
  content: z.string().nullable(),
  file_token: z.string().nullable(),
  language: z.string().nullable(),
  id: z.string().nullable(),
  link: z.string().nullable(),
  company: CompanyReferenceSchema.nullable(),
})

const EstablishmentSchema = z.object({
  number: z.string().nullable(),
  name: z.string().nullable(),
  trade_name: z.string().nullable(),
  acronym: z.string().nullable(),
  activities: z.array(ActivitySchema).nullable(),
  fields_of_activity: z.array(z.string()).nullable(),
  local_activities: z.array(LocalActivitySchema).nullable(),
  date_of_creation: z.string().nullable(),
  status: z.string().nullable(),
  date_of_cessation: z.string().nullable(),
  address_line_1: z.string().nullable(),
  address_line_2: z.string().nullable(),
  postal_code: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  country_code: z.string().nullable(),
})

const ContactSchema = z.object({
  type: z.string().nullable(),
  value: z.string().nullable(),
})

export const InternationalCompanyResponseSchema = z.object({
  company_number: z.string(),
  country_code: z.string(),
  country: z.string().nullish(),
  state: z.string().nullish(),
  name: z.string(),
  trade_name: z.string().nullable(),
  acronym: z.string().nullable(),
  vat_number: z.string().nullable(),
  legal_form_code: z.string().nullable(),
  local_legal_form_code: z.string().nullable(),
  local_legal_form_name: z.string().nullable(),
  type: ContactTypeEnum.nullable(),
  activities: z.array(ActivitySchema).nullable(),
  fields_of_activity: z.array(z.string()).nullable(),
  local_activities: z.array(LocalActivitySchema).nullable(),
  date_of_creation: z.string().nullable(),
  status: z.string(),
  date_of_cessation: z.string().nullable(),
  workforce: z.number().nullable(),
  workforce_range: z.string().nullable(),
  head_office: AddressSchema.nullable(),
  commercial_register_registration_status: z.string().nullable(),
  commercial_register_registration_location: z.string().nullable(),
  commercial_register_registration_date: z.string().nullable(),
  commercial_register_cessation_date: z.string().nullable(),
  share_capital: z.number().nullable(),
  share_capital_currency: z.string().nullable(),
  fiscal_year_end: z.string().nullable(),
  next_fiscal_year_end: z.string().nullable(),
  // These fields are only present if requested in the fields parameter
  officers: z.array(OfficerSchema).optional(),
  ubos: z.array(UboSchema).optional(),
  financials: z.array(FinancialSchema).optional(),
  documents: z.array(DocumentSchema).optional(),
  certificates: z.array(CertificateSchema).optional(),
  publications: z.array(PublicationSchema).optional(),
  establishments: z.array(EstablishmentSchema).optional(),
  contacts: z.array(ContactSchema).optional(),
})

export type InternationalCompanyResponse = z.infer<
  typeof InternationalCompanyResponseSchema
>

const FieldsEnum = z.enum([
  'officers',
  'ubos',
  'financials',
  'documents',
  'certificates',
  'publications',
  'establishments',
  'contacts',
])

const InternationalCompanyRequestParamsSchema = z.object({
  api_token: z.string(),
  country_code: PAPPERS_COUNTRY_CODES.optional(),
  company_number: z.string().optional(),
  lei: z.string().optional(),
  isin: z.string().optional(),
  fields: z.string().optional(),
  allow_partial_data: z.boolean().optional(),
})

export type InternationalCompanyRequestParams = z.infer<
  typeof InternationalCompanyRequestParamsSchema
>

export type InternationalCompanyV1Params = {
  countryCode?: z.infer<typeof PAPPERS_COUNTRY_CODES>
  companyNumber?: string
  lei?: string
  isin?: string
  fields?: z.infer<typeof FieldsEnum>[]
  allowPartialData?: boolean
}

export const internationalCompanyV1 = async ({
  countryCode,
  companyNumber,
  lei,
  isin,
  fields,
  allowPartialData = false,
}: InternationalCompanyV1Params) => {
  // Validate that at least one identifier is provided
  if (!companyNumber && !lei && !isin) {
    throw new Error(
      'At least one identifier (companyNumber, lei, or isin) must be provided',
    )
  }

  // If companyNumber is provided, countryCode is required
  if (companyNumber && !countryCode) {
    throw new Error('countryCode is required when using companyNumber')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)
  const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '500'

  try {
    const url = new URL(`${PAPPERS_CONFIG.BASE_URL}/v1/company`)
    url.searchParams.set('api_token', PAPPERS_CONFIG.API_KEY)

    if (countryCode) {
      url.searchParams.set('country_code', countryCode)
    }
    if (companyNumber) {
      url.searchParams.set('company_number', companyNumber)
    }
    if (lei) {
      url.searchParams.set('lei', lei)
    }
    if (isin) {
      url.searchParams.set('isin', isin)
    }
    if (fields && fields.length > 0) {
      url.searchParams.set('fields', fields.join(','))
    }
    if (allowPartialData) {
      url.searchParams.set('allow_partial_data', 'true')
    }

    logger.info({
      msg: 'International Company API request',
      event: 'international_company_api_request',
      metadata: {
        url: url.toString(),
        countryCode,
        companyNumber,
        lei,
        isin,
        fields,
        allowPartialData,
      },
    })

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    httpStatusCode = response.status.toString()

    if (!response.ok) {
      logger.error({
        msg: 'International Company API error response',
        event: 'international_company_api_error_response',
        metadata: {
          status: response.status,
        },
      })

      // Track error in metrics
      metricsTimer.stop({
        service: 'pappers',
        endpoint: 'international_company',
      })
      externalApiRequestsCounter.inc({
        service: 'pappers',
        endpoint: 'international_company',
        status_code: httpStatusCode,
      })

      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    logger.info({
      msg: 'International Company API response received',
      event: 'international_company_api_response',
      metadata: {
        status: response.status,
        hasData: !!data,
      },
    })

    const parsedData = InternationalCompanyResponseSchema.parse(data)

    logger.info({
      msg: 'International Company API response parsed successfully',
      event: 'international_company_api_response_parsed',
      metadata: {
        companyName: parsedData.name,
        companyNumber: parsedData.company_number,
        countryCode: parsedData.country_code,
      },
    })

    // Track successful request
    metricsTimer.stop({ service: 'pappers', endpoint: 'international_company' })
    externalApiRequestsCounter.inc({
      service: 'pappers',
      endpoint: 'international_company',
      status_code: httpStatusCode,
    })

    return parsedData
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      httpStatusCode = '408'
      metricsTimer.stop({
        service: 'pappers',
        endpoint: 'international_company',
      })
      externalApiRequestsCounter.inc({
        service: 'pappers',
        endpoint: 'international_company',
        status_code: httpStatusCode,
      })

      logger.error({
        msg: 'International Company API request timed out',
        event: 'international_company_api_timeout',
        metadata: { error: error.message },
      })
      throw new Error('International Company API request timed out')
    }

    if (httpStatusCode === '500') {
      metricsTimer.stop({
        service: 'pappers',
        endpoint: 'international_company',
      })
      externalApiRequestsCounter.inc({
        service: 'pappers',
        endpoint: 'international_company',
        status_code: httpStatusCode,
      })
    }

    logger.error({
      msg: 'International Company API error',
      event: 'international_company_api_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        countryCode,
        companyNumber,
        lei,
        isin,
      },
    })
    throw error
  } finally {
    clearTimeout(timer)
  }
}
