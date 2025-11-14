import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../common'

export const GetPlacesEnrichmentParamsSchema = z.object({
  userPlaceId: z.string(),
})

export const FinancialSchema = z.array(
  z.object({
    id: z.string(),
    type: z.string(),
    financialsStartDate: z.string(),
    financialsEndDate: z.string(),
    depositDate: z.string(),
    currency: z.string(),
    availability: z.string(),
    ratios: z
      .object({
        turnover: z.number(),
        grossProfit: z.number(),
        ebitda: z.number(),
        operatingProfit: z.number(),
        netIncome: z.number(),
        revenueGrowthRate: z.number(),
        grossMarginRate: z.number(),
        ebitdaMargin: z.number(),
        ebitMargin: z.number(),
        workingCapitalRequirements: z.number(),
        daySalesOutstanding: z.number(),
        daysPayableOutstanding: z.number(),
        cashFlowFromOperations: z.number(),
        netWorkingCapital: z.number(),
        cash: z.number(),
        financialDebt: z.number(),
        netFinancialDebt: z.number(),
        capitalDebtRepaymentCapacity: z.number(),
        gearingRatio: z.number(),
        leverageRatio: z.number(),
        debtsPayableWithinOneYear: z.number(),
        debtCoverageRatio: z.number(),
        equity: z.number(),
        netMargin: z.number(),
        returnOnEquity: z.number(),
        valueAddedRatio: z.number(),
        exportTurnover: z.number(),
      })
      .optional(),
    relatedDocuments: z.array(
      z.object({
        type: z.string(),
        date: z.string(),
        fileAvailable: z.boolean(),
        description: z.string(),
        fileToken: z.string(),
        fileFormat: z.string(),
      }),
    ),
  }),
)

export const GetPlacesEnrichmentResponseSchema = z.object({
  id: z.string().nullable(),
  enrichment: z
    .object({
      id: z.string(),
      description: z.string(),
      shortDescription: z.string(),
      domain: z.string(),
      domainRegisteredAt: z.string(),
      success: z.boolean(),
    })
    .optional(),
  company: z
    .object({
      id: z.string(),
      reasoning: z.string(),
      confidenceScore: z.number(),
      companyNumber: z.string(),
      countryCode: z.string(),
      country: z.string(),
      state: z.string(),
      lei: z.string(),
      isin: z.string(),
      vatNumber: z.string(),
      name: z.string(),
      tradeName: z.string(),
      acronym: z.string(),
      legalFormCode: z.string(),
      localLegalFormCode: z.string(),
      localLegalFormName: z.string(),
      type: z.string(),
      status: z.string(),
      dateOfCreation: z.string(),
      dateOfCessation: z.string(),
      workforce: z.number(),
      workforceRange: z.string(),
      headOfficeAddressLine1: z.string(),
      headOfficeAddressLine2: z.string(),
      headOfficePostalCode: z.string(),
      headOfficeCity: z.string(),
      headOfficeCountry: z.string(),
      headOfficeCountryCode: z.string(),
      commercialRegisterRegistrationStatus: z.string(),
      commercialRegisterRegistrationDate: z.string(),
      commercialRegisterRegistrationNumber: z.string(),
      commercialRegisterCessationDate: z.string(),
      shareCapital: z.string(),
      shareCapitalCurrency: z.string(),
      fiscalYearEnd: z.string(),
      nextFiscalYearEnd: z.string(),
      fieldsOfActivity: z.string(),
      ubos: z.array(
        z.object({
          id: z.string(),
          lastName: z.string(),
          firstName: z.string(),
          gender: z.string(),
          dateOfBirth: z.string(),
          dateOfBirthFormat: z.string(),
          nationality: z.string(),
          nationalityCode: z.string(),
          addressLine1: z.string(),
          addressLine2: z.string(),
          postalCode: z.string(),
          city: z.string(),
          country: z.string(),
          countryCode: z.string(),
          percentageOfShares: z.string(),
          votingPercentage: z.string(),
        }),
      ),
      contacts: z.array(
        z.object({
          id: z.string(),
          type: z.string(),
          value: z.string(),
        }),
      ),
      establishments: z.array(
        z.object({
          id: z.string(),
          number: z.string(),
          name: z.string(),
          tradeName: z.string(),
          acronym: z.string(),
          fieldsOfActivity: z.string(),
          dateOfCreation: z.string(),
          status: z.string(),
          dateOfCessation: z.string(),
          addressLine1: z.string(),
          addressLine2: z.string(),
          postalCode: z.string(),
          city: z.string(),
          country: z.string(),
          countryCode: z.string(),
        }),
      ),
      activities: z.array(
        z.object({
          id: z.string(),
          code: z.string(),
          name: z.string(),
          type: z.string(),
          classification: z.string(),
        }),
      ),
      financials: FinancialSchema.optional(),
    })
    .optional(),
})

export const GetPlacesEnrichmentApiResponseSchema = z.union([
  GetPlacesEnrichmentResponseSchema,
  ApiErrorResponseSchema,
])

export type GetPlacesEnrichmentApiResponse = z.infer<
  typeof GetPlacesEnrichmentApiResponseSchema
>
export type GetPlacesEnrichmentParams = z.infer<
  typeof GetPlacesEnrichmentParamsSchema
>

export type Financial = z.infer<typeof FinancialSchema>
