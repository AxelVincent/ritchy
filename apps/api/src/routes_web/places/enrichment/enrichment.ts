import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { getEnrichmentByUserPlaceId } from '../../../services/enrichment/shared/queries/get_enrichment_by_user_place_id'
import type { GetEnrichmentApiResponse, GetEnrichmentParams } from './contract'

export const getEnrichmentHandler = async (
  req: Request<GetEnrichmentParams>,
  res: Response<GetEnrichmentApiResponse>,
) => {
  const { userPlaceId } = req.params

  logger.info({
    msg: 'Enrichment endpoint called',
    event: 'enrichment_endpoint_called',
    metadata: { userPlaceId },
  })

  try {
    const enrichment = await getEnrichmentByUserPlaceId(userPlaceId)

    logger.info({
      msg: 'Enrichment',
      event: 'enrichment_found',
      metadata: { enrichment },
    })

    if (!enrichment?.enrichment) {
      logger.info({
        msg: 'Enrichment not found',
        event: 'enrichment_not_found',
        metadata: { userPlaceId },
      })
      res.status(200).json({ id: null })
      return
    }

    res.json({
      id: enrichment.enrichment.id,
      enrichment: {
        id: enrichment.enrichment.id,
        description: enrichment.enrichment.description ?? '',
        shortDescription: enrichment.enrichment.shortDescription ?? '',
        domain: enrichment.enrichment.domain ?? '',
        domainRegisteredAt:
          enrichment.enrichment.domainRegisteredAt?.toISOString() ?? '',
        success: enrichment.enrichment.success,
        technologies: enrichment?.technologies
          ? enrichment?.technologies.map((tech) => ({
              technology: tech.technology,
              category: tech.category,
            }))
          : [],
      },
      company: {
        id: enrichment.company?.id ?? '',
        reasoning: enrichment.company?.reasoning ?? '',
        confidenceScore: enrichment.company?.confidence_score ?? 0,
        companyNumber: enrichment.company?.company_number ?? '',
        countryCode: enrichment.company?.country_code ?? '',
        country: enrichment.company?.country ?? '',
        state: enrichment.company?.state ?? '',
        lei: enrichment.company?.lei ?? '',
        isin: enrichment.company?.isin ?? '',
        vatNumber: enrichment.company?.vat_number ?? '',
        name: enrichment.company?.name ?? '',
        tradeName: enrichment.company?.trade_name ?? '',
        acronym: enrichment.company?.acronym ?? '',
        legalFormCode: enrichment.company?.legal_form_code ?? '',
        localLegalFormCode: enrichment.company?.local_legal_form_code ?? '',
        localLegalFormName: enrichment.company?.local_legal_form_name ?? '',
        type: enrichment.company?.type ?? '',
        status: enrichment.company?.status ?? '',
        dateOfCreation:
          enrichment.company?.date_of_creation?.toISOString() ?? '',
        dateOfCessation:
          enrichment.company?.date_of_cessation?.toISOString() ?? '',
        workforce: enrichment.company?.workforce ?? 0,
        workforceRange: enrichment.company?.workforce_range ?? '',
        headOfficeAddressLine1:
          enrichment.company?.head_office_address_line_1 ?? '',
        headOfficeAddressLine2:
          enrichment.company?.head_office_address_line_2 ?? '',
        headOfficePostalCode: enrichment.company?.head_office_postal_code ?? '',
        headOfficeCity: enrichment.company?.head_office_city ?? '',
        headOfficeCountry: enrichment.company?.head_office_country ?? '',
        headOfficeCountryCode:
          enrichment.company?.head_office_country_code ?? '',
        commercialRegisterRegistrationStatus:
          enrichment.company?.commercial_register_registration_status ?? '',
        commercialRegisterRegistrationDate:
          enrichment.company?.commercial_register_registration_date?.toISOString() ??
          '',
        commercialRegisterRegistrationNumber:
          enrichment.company?.commercial_register_registration_location ?? '',
        commercialRegisterCessationDate:
          enrichment.company?.commercial_register_cessation_date?.toISOString() ??
          '',
        shareCapital: enrichment.company?.share_capital ?? '',
        shareCapitalCurrency: enrichment.company?.share_capital_currency ?? '',
        fiscalYearEnd: enrichment.company?.fiscal_year_end ?? '',
        nextFiscalYearEnd: enrichment.company?.next_fiscal_year_end ?? '',
        fieldsOfActivity: enrichment.company?.fields_of_activity ?? '',
        ubos: enrichment?.ubos
          ? enrichment?.ubos.map((ubo) => ({
              id: ubo.id,
              lastName: ubo.last_name ?? '',
              firstName: ubo.first_name ?? '',
              gender: ubo.gender ?? '',
              dateOfBirth: ubo.date_of_birth?.toISOString() ?? '',
              dateOfBirthFormat: ubo.date_of_birth_format ?? '',
              nationality: ubo.nationality ?? '',
              nationalityCode: ubo.nationality_code ?? '',
              addressLine1: ubo.address_line_1 ?? '',
              addressLine2: ubo.address_line_2 ?? '',
              postalCode: ubo.postal_code ?? '',
              city: ubo.city ?? '',
              country: ubo.country ?? '',
              countryCode: ubo.country_code ?? '',
              percentageOfShares: ubo.percentage_of_shares ?? '',
              votingPercentage: ubo.voting_percentage ?? '',
            }))
          : [],
        contacts: enrichment?.contacts
          ? enrichment?.contacts.map((contact) => ({
              id: contact.id,
              type: contact.type ?? '',
              value: contact.value ?? '',
            }))
          : [],
        establishments: enrichment?.establishments
          ? enrichment?.establishments.map((establishment) => ({
              id: establishment.id,
              number: establishment.number ?? '',
              name: establishment.name ?? '',
              tradeName: establishment.trade_name ?? '',
              acronym: establishment.acronym ?? '',
              fieldsOfActivity: establishment.fields_of_activity ?? '',
              dateOfCreation:
                establishment.date_of_creation?.toISOString() ?? '',
              status: establishment.status ?? '',
              dateOfCessation:
                establishment.date_of_cessation?.toISOString() ?? '',
              addressLine1: establishment.address_line_1 ?? '',
              addressLine2: establishment.address_line_2 ?? '',
              postalCode: establishment.postal_code ?? '',
              city: establishment.city ?? '',
              country: establishment.country ?? '',
              countryCode: establishment.country_code ?? '',
            }))
          : [],
        activities: enrichment?.activities
          ? enrichment?.activities.map((activity) => ({
              id: activity.id,
              code: activity.code ?? '',
              name: activity.name ?? '',
              type: activity.type ?? '',
              classification: activity.classification ?? '',
            }))
          : [],
        financials: enrichment?.financials
          ? enrichment?.financials.map((financial) => ({
              id: financial.id,
              type: financial.type ?? '',
              financialsStartDate:
                financial.financials_start_date?.toISOString() ?? '',
              financialsEndDate:
                financial.financials_end_date?.toISOString() ?? '',
              depositDate: financial.deposit_date?.toISOString() ?? '',
              currency: financial.currency ?? '',
              availability: financial.availability ?? '',
              ratios: financial.ratios
                ? {
                    turnover: financial.ratios.turnover ?? 0,
                    grossProfit: financial.ratios.gross_profit ?? 0,
                    ebitda: financial.ratios.ebitda ?? 0,
                    operatingProfit: financial.ratios.operating_profit ?? 0,
                    netIncome: financial.ratios.net_income ?? 0,
                    revenueGrowthRate:
                      financial.ratios.revenue_growth_rate ?? 0,
                    grossMarginRate: financial.ratios.gross_margin_rate ?? 0,
                    ebitdaMargin: financial.ratios.ebitda_margin ?? 0,
                    ebitMargin: financial.ratios.ebit_margin ?? 0,
                    workingCapitalRequirements:
                      financial.ratios.working_capital_requirements ?? 0,
                    daySalesOutstanding:
                      financial.ratios.day_sales_outstanding ?? 0,
                    daysPayableOutstanding:
                      financial.ratios.days_payable_outstanding ?? 0,
                    cashFlowFromOperations:
                      financial.ratios.cash_flow_from_operations ?? 0,
                    netWorkingCapital:
                      financial.ratios.net_working_capital ?? 0,
                    cash: financial.ratios.cash ?? 0,
                    financialDebt: financial.ratios.financial_debt ?? 0,
                    netFinancialDebt: financial.ratios.net_financial_debt ?? 0,
                    capitalDebtRepaymentCapacity:
                      financial.ratios.capital_debt_repayment_capacity ?? 0,
                    gearingRatio: financial.ratios.gearing_ratio ?? 0,
                    leverageRatio: financial.ratios.leverage_ratio ?? 0,
                    debtsPayableWithinOneYear:
                      financial.ratios.debts_payable_within_one_year ?? 0,
                    debtCoverageRatio:
                      financial.ratios.debt_coverage_ratio ?? 0,
                    equity: financial.ratios.equity ?? 0,
                    netMargin: financial.ratios.net_margin ?? 0,
                    returnOnEquity: financial.ratios.return_on_equity ?? 0,
                    valueAddedRatio: financial.ratios.value_added_ratio ?? 0,
                    exportTurnover: financial.ratios.export_turnover ?? 0,
                  }
                : undefined,
              relatedDocuments: financial.related_documents
                ? financial.related_documents.map((relatedDocument) => ({
                    type: relatedDocument.type ?? '',
                    date: relatedDocument.date ?? '',
                    fileAvailable: relatedDocument.file_available ?? false,
                    description: relatedDocument.description ?? '',
                    fileToken: relatedDocument.file_token ?? '',
                    fileFormat: relatedDocument.file_format ?? '',
                  }))
                : [],
            }))
          : [],
      },
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to get enrichment data',
      event: 'get_enrichment_data_error',
      metadata: { error, userPlaceId },
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}
