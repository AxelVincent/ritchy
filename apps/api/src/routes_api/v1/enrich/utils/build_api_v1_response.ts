import { eq } from 'drizzle-orm'
import { db } from '../../../../db/db'
import {
  enrichmentCompany,
  enrichmentCompanyActivity,
  enrichmentCompanyEstablishment,
  enrichmentCompanyFinancial,
  enrichmentCompanyOfficer,
  enrichmentCompanyUbo,
  enrichment as enrichmentTable,
  place,
  userPlace,
} from '../../../../db/schema'
import type { PreferredPlace } from '../../../../external/google_maps/types'
import { getEnrichmentEmails } from '../../../../services/enrichment/shared/queries/get_enrichment_emails'
import { getEnrichmentFacebooks } from '../../../../services/enrichment/shared/queries/get_enrichment_facebooks'
import { getEnrichmentInstagrams } from '../../../../services/enrichment/shared/queries/get_enrichment_instagrams'
import { getEnrichmentLinkedins } from '../../../../services/enrichment/shared/queries/get_enrichment_linkedins'
import { getEnrichmentTechnologies } from '../../../../services/enrichment/shared/queries/get_enrichment_technologies'
import type { ApiV1CompanyEnrichmentData } from '../contract'

/**
 * Select the best LinkedIn URL
 * Prioritizes company pages (/company/) over personal profiles (/in/)
 */
const selectBestLinkedIn = (urls: string[]): string | null => {
  if (urls.length === 0) return null
  const companyUrl = urls.find((u) => u.includes('/company/'))
  if (companyUrl) return companyUrl
  return urls[0] ?? null
}

/**
 * Determine email type based on characteristics
 */
const getEmailType = (email: {
  role: boolean
  free: boolean
}): 'generic' | 'role' | 'personal' => {
  if (email.role) return 'role'
  if (email.free) return 'personal'
  return 'generic'
}

/**
 * Build the full API V1 company enrichment response data
 */
export const buildApiV1CompanyEnrichmentData = async (
  userPlaceId: string,
): Promise<ApiV1CompanyEnrichmentData | null> => {
  // Get base enrichment with company and place data
  const [enrichmentData] = await db
    .select({
      enrichment: enrichmentTable,
      company: enrichmentCompany,
      place: place,
    })
    .from(enrichmentTable)
    .innerJoin(place, eq(enrichmentTable.placeId, place.id))
    .innerJoin(userPlace, eq(userPlace.place_id, place.id))
    .leftJoin(
      enrichmentCompany,
      eq(enrichmentTable.id, enrichmentCompany.enrichment_id),
    )
    .where(eq(userPlace.id, userPlaceId))
    .limit(1)

  if (!enrichmentData) {
    return null
  }

  const { enrichment, company, place: placeData } = enrichmentData

  // Parallel fetch all related data
  const [
    technologies,
    linkedins,
    facebooks,
    instagrams,
    emails,
    activities,
    establishments,
    financials,
    ubos,
    officers,
  ] = await Promise.all([
    getEnrichmentTechnologies(enrichment.id),
    getEnrichmentLinkedins(enrichment.id),
    getEnrichmentFacebooks(enrichment.id),
    getEnrichmentInstagrams(enrichment.id),
    getEnrichmentEmails(enrichment.id),
    company ? getCompanyActivities(company.id) : Promise.resolve([]),
    company ? getCompanyEstablishments(company.id) : Promise.resolve([]),
    company ? getCompanyFinancials(company.id) : Promise.resolve([]),
    company ? getCompanyUbos(company.id) : Promise.resolve([]),
    company ? getCompanyOfficers(company.id) : Promise.resolve([]),
  ])

  // Extract Google Place data
  const googlePlace = placeData.google_place_data as PreferredPlace | null

  // Build response
  return {
    // Quick access (from Google Maps)
    googlePlaceId: placeData.source_id,
    name: googlePlace?.displayName?.text ?? placeData.name,
    formattedAddress: googlePlace?.formattedAddress ?? null,
    phone: googlePlace?.internationalPhoneNumber ?? null,
    websiteUrl: googlePlace?.websiteUri ?? null,
    rating: googlePlace?.rating ?? null,
    reviewCount: googlePlace?.userRatingCount ?? null,
    location: googlePlace?.location
      ? {
          lat: googlePlace.location.latitude,
          lng: googlePlace.location.longitude,
        }
      : null,

    // Full Google Place data
    googlePlace,

    // Website scraping data
    website: {
      domain: enrichment.domain,
      title: enrichment.title,
      description: enrichment.description,
      shortDescription: enrichment.shortDescription,
      domainRegisteredAt: enrichment.domainRegisteredAt?.toISOString() ?? null,
      emails: emails.map((e) => ({
        email: e.email,
        type: getEmailType({ role: e.role, free: e.free }),
      })),
      socials: {
        linkedin: selectBestLinkedIn(linkedins.map((l) => l.url)),
        facebook: facebooks[0]?.url ?? null,
        instagram: instagrams[0]?.url ?? null,
      },
      technologies: technologies.technologies.map((t) => t.technology),
    },

    // Registry data
    registry: company
      ? {
          // Identifiers
          registrationNumber: company.company_number,
          countryCode: company.country_code,
          country: company.country,
          state: company.state,
          lei: company.lei,
          isin: company.isin,
          vatNumber: company.vat_number,

          // Names
          name: company.name,
          tradeName: company.trade_name,
          acronym: company.acronym,

          // Legal structure
          legalFormCode: company.legal_form_code,
          localLegalFormCode: company.local_legal_form_code,
          localLegalFormName: company.local_legal_form_name,
          type: company.type,

          // Status & dates
          status: company.status,
          createdAt: company.date_of_creation?.toISOString() ?? null,
          cessationDate: company.date_of_cessation?.toISOString() ?? null,

          // Workforce
          workforce: company.workforce,
          workforceRange: company.workforce_range,

          // Head office
          headOffice: company.head_office_address_line_1
            ? {
                addressLine1: company.head_office_address_line_1,
                addressLine2: company.head_office_address_line_2,
                postalCode: company.head_office_postal_code,
                city: company.head_office_city,
                country: company.head_office_country,
                countryCode: company.head_office_country_code,
              }
            : null,

          // Commercial register
          commercialRegister: company.commercial_register_registration_status
            ? {
                status: company.commercial_register_registration_status,
                location: company.commercial_register_registration_location,
                registrationDate:
                  company.commercial_register_registration_date?.toISOString() ??
                  null,
                cessationDate:
                  company.commercial_register_cessation_date?.toISOString() ??
                  null,
              }
            : null,

          // Financial info
          shareCapital: company.share_capital?.toString() ?? null,
          shareCapitalCurrency: company.share_capital_currency,
          fiscalYearEnd: company.fiscal_year_end,
          fieldsOfActivity: company.fields_of_activity,

          // Related data
          activities: activities.map((a) => ({
            code: a.code,
            name: a.name,
            type: a.type as 'standard' | 'local',
            classification: a.classification,
          })),

          establishments: establishments.map((e) => ({
            number: e.number,
            name: e.name,
            tradeName: e.trade_name,
            acronym: e.acronym,
            status: e.status,
            createdAt: e.date_of_creation?.toISOString() ?? null,
            cessationDate: e.date_of_cessation?.toISOString() ?? null,
            fieldsOfActivity: e.fields_of_activity,
            address: e.address_line_1
              ? {
                  addressLine1: e.address_line_1,
                  addressLine2: e.address_line_2,
                  postalCode: e.postal_code,
                  city: e.city,
                  country: e.country,
                  countryCode: e.country_code,
                }
              : null,
          })),

          financials: financials.map((f) => ({
            type: f.type,
            startDate: f.financials_start_date?.toISOString() ?? null,
            endDate: f.financials_end_date?.toISOString() ?? null,
            depositDate: f.deposit_date?.toISOString() ?? null,
            currency: f.currency,
            availability: f.availability,
            ratios: f.ratios
              ? {
                  turnover: f.ratios.turnover ?? null,
                  grossProfit: f.ratios.gross_profit ?? null,
                  ebitda: f.ratios.ebitda ?? null,
                  operatingProfit: f.ratios.operating_profit ?? null,
                  netIncome: f.ratios.net_income ?? null,
                  revenueGrowthRate: f.ratios.revenue_growth_rate ?? null,
                  grossMarginRate: f.ratios.gross_margin_rate ?? null,
                  ebitdaMargin: f.ratios.ebitda_margin ?? null,
                  ebitMargin: f.ratios.ebit_margin ?? null,
                  workingCapitalRequirements:
                    f.ratios.working_capital_requirements ?? null,
                  daySalesOutstanding: f.ratios.day_sales_outstanding ?? null,
                  daysPayableOutstanding:
                    f.ratios.days_payable_outstanding ?? null,
                  cashFlowFromOperations:
                    f.ratios.cash_flow_from_operations ?? null,
                  netWorkingCapital: f.ratios.net_working_capital ?? null,
                  cash: f.ratios.cash ?? null,
                  financialDebt: f.ratios.financial_debt ?? null,
                  netFinancialDebt: f.ratios.net_financial_debt ?? null,
                  capitalDebtRepaymentCapacity:
                    f.ratios.capital_debt_repayment_capacity ?? null,
                  gearingRatio: f.ratios.gearing_ratio ?? null,
                  leverageRatio: f.ratios.leverage_ratio ?? null,
                  debtsPayableWithinOneYear:
                    f.ratios.debts_payable_within_one_year ?? null,
                  debtCoverageRatio: f.ratios.debt_coverage_ratio ?? null,
                  equity: f.ratios.equity ?? null,
                  netMargin: f.ratios.net_margin ?? null,
                  returnOnEquity: f.ratios.return_on_equity ?? null,
                  valueAddedRatio: f.ratios.value_added_ratio ?? null,
                  exportTurnover: f.ratios.export_turnover ?? null,
                }
              : null,
            relatedDocuments:
              f.related_documents?.map((d) => ({
                type: d.type ?? null,
                date: d.date ?? null,
                description: d.description ?? null,
                fileAvailable: d.file_available ?? null,
                fileFormat: d.file_format ?? null,
              })) ?? null,
          })),

          ubos: ubos.map((u) => ({
            firstName: u.first_name,
            lastName: u.last_name,
            gender: u.gender,
            dateOfBirth: u.date_of_birth?.toISOString() ?? null,
            nationality: u.nationality,
            nationalityCode: u.nationality_code,
            percentageOfShares: u.percentage_of_shares,
            votingPercentage: u.voting_percentage,
            address: u.address_line_1
              ? {
                  addressLine1: u.address_line_1,
                  addressLine2: u.address_line_2,
                  postalCode: u.postal_code,
                  city: u.city,
                  country: u.country,
                  countryCode: u.country_code,
                }
              : null,
          })),

          officers: officers.map((o) => ({
            type: o.type as 'physical' | 'legal' | null,
            role: o.role,
            mention: o.mention,
            appointmentDate: o.date_of_appointment?.toISOString() ?? null,
            firstName: o.first_name,
            lastName: o.last_name,
            gender: o.gender,
            dateOfBirth: o.date_of_birth?.toISOString() ?? null,
            nationality: o.nationality,
            nationalityCode: o.nationality_code,
            companyName: o.company_name,
            companyNumber: o.company_number,
            address: o.address_line_1
              ? {
                  addressLine1: o.address_line_1,
                  addressLine2: o.address_line_2,
                  postalCode: o.postal_code,
                  city: o.city,
                  country: o.country,
                  countryCode: o.country_code,
                }
              : null,
          })),
        }
      : null,

    // Company match confidence (how confident we are this is the right company)
    companyMatch: company
      ? {
          confidenceScore: company.confidence_score,
          reasoning: company.reasoning,
        }
      : null,

    // Enrichment quality
    enrichmentScore: enrichment.score,
  }
}

// ============================================================================
// Helper Queries for Related Company Data
// ============================================================================

const getCompanyActivities = async (companyId: string) => {
  return db
    .select()
    .from(enrichmentCompanyActivity)
    .where(eq(enrichmentCompanyActivity.company_id, companyId))
}

const getCompanyEstablishments = async (companyId: string) => {
  return db
    .select()
    .from(enrichmentCompanyEstablishment)
    .where(eq(enrichmentCompanyEstablishment.company_id, companyId))
}

const getCompanyFinancials = async (companyId: string) => {
  return db
    .select()
    .from(enrichmentCompanyFinancial)
    .where(eq(enrichmentCompanyFinancial.company_id, companyId))
}

const getCompanyUbos = async (companyId: string) => {
  return db
    .select()
    .from(enrichmentCompanyUbo)
    .where(eq(enrichmentCompanyUbo.company_id, companyId))
}

const getCompanyOfficers = async (companyId: string) => {
  return db
    .select()
    .from(enrichmentCompanyOfficer)
    .where(eq(enrichmentCompanyOfficer.company_id, companyId))
}
