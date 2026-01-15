import { JsonTreeViewer } from '@/components/ui/json-tree-viewer'
import { SchemaDocView } from '@/components/ui/schema-doc-view'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ApiV1CompanyEnrichmentSuccessResponseSchema,
  ApiV1ErrorResponseSchema,
} from '@api/routes_api/v1/enrich/contract'
import { BookOpen, Braces, Code } from 'lucide-react'
import { useMemo } from 'react'
import { zodToJsonSchema } from 'zod-to-json-schema'

// Example responses for each status code
const responseExamples = {
  '200': {
    success: true,
    data: {
      googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      name: 'Acme Corporation',
      formattedAddress: '123 Business St, San Francisco, CA 94102',
      phone: '+1 415-555-0123',
      websiteUrl: 'https://acme.example.com',
      rating: 4.5,
      reviewCount: 127,
      location: { lat: 37.7749, lng: -122.4194 },
      googlePlace: {
        id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        displayName: { text: 'Acme Corporation', languageCode: 'en' },
        formattedAddress: '123 Business St, San Francisco, CA 94102',
        nationalPhoneNumber: '(415) 555-0123',
        internationalPhoneNumber: '+1 415-555-0123',
        websiteUri: 'https://acme.example.com',
        rating: 4.5,
        userRatingCount: 127,
        priceLevel: 'PRICE_LEVEL_MODERATE',
        businessStatus: 'OPERATIONAL',
        types: ['corporation', 'point_of_interest', 'establishment'],
        primaryType: 'corporation',
        primaryTypeDisplayName: { text: 'Corporation', languageCode: 'en' },
        location: { latitude: 37.7749, longitude: -122.4194 },
        regularOpeningHours: {
          openNow: true,
          periods: [
            {
              open: { day: 1, hour: 9, minute: 0 },
              close: { day: 1, hour: 18, minute: 0 },
            },
            {
              open: { day: 2, hour: 9, minute: 0 },
              close: { day: 2, hour: 18, minute: 0 },
            },
            {
              open: { day: 3, hour: 9, minute: 0 },
              close: { day: 3, hour: 18, minute: 0 },
            },
            {
              open: { day: 4, hour: 9, minute: 0 },
              close: { day: 4, hour: 18, minute: 0 },
            },
            {
              open: { day: 5, hour: 9, minute: 0 },
              close: { day: 5, hour: 17, minute: 0 },
            },
          ],
          weekdayDescriptions: [
            'Monday: 9:00 AM – 6:00 PM',
            'Tuesday: 9:00 AM – 6:00 PM',
            'Wednesday: 9:00 AM – 6:00 PM',
            'Thursday: 9:00 AM – 6:00 PM',
            'Friday: 9:00 AM – 5:00 PM',
            'Saturday: Closed',
            'Sunday: Closed',
          ],
        },
      },
      website: {
        domain: 'acme.example.com',
        title: 'Acme Corp - Enterprise Solutions',
        description:
          'Leading provider of enterprise solutions for modern businesses',
        shortDescription:
          'Enterprise software company specializing in B2B solutions',
        domainRegisteredAt: '2010-03-15T00:00:00Z',
        emails: [
          { email: 'contact@acme.example.com', type: 'generic' },
          { email: 'sales@acme.example.com', type: 'role' },
          { email: 'john.smith@acme.example.com', type: 'personal' },
        ],
        socials: {
          linkedin: 'https://linkedin.com/company/acme',
          facebook: 'https://facebook.com/acmecorp',
          instagram: 'https://instagram.com/acmecorp',
        },
        technologies: [
          'React',
          'Node.js',
          'PostgreSQL',
          'AWS',
          'Stripe',
          'Intercom',
        ],
      },
      registry: {
        registrationNumber: 'C1234567',
        countryCode: 'US',
        country: 'United States',
        state: 'California',
        lei: '549300EXAMPLE000LEI00',
        isin: null,
        vatNumber: 'US123456789',
        name: 'Acme Corporation Inc.',
        tradeName: 'Acme Corp',
        acronym: 'ACME',
        legalFormCode: 'LLC',
        localLegalFormCode: 'CA-LLC',
        localLegalFormName: 'California Limited Liability Company',
        type: 'Private Company',
        status: 'active',
        createdAt: '2010-01-15T00:00:00Z',
        cessationDate: null,
        workforce: 150,
        workforceRange: '100-200',
        headOffice: {
          addressLine1: '123 Business St',
          addressLine2: 'Suite 500',
          postalCode: '94102',
          city: 'San Francisco',
          country: 'United States',
          countryCode: 'US',
        },
        commercialRegister: {
          status: 'Active',
          location: 'Sacramento, CA',
          registrationDate: '2010-01-15',
          cessationDate: null,
        },
        shareCapital: '1000000',
        shareCapitalCurrency: 'USD',
        fiscalYearEnd: '12-31',
        fieldsOfActivity: 'Enterprise software development and consulting',
        activities: [
          {
            code: '62.01',
            name: 'Computer programming activities',
            type: 'standard',
            classification: 'NACE',
          },
          {
            code: '62.02',
            name: 'Computer consultancy activities',
            type: 'standard',
            classification: 'NACE',
          },
        ],
        establishments: [
          {
            number: 'EST001',
            name: 'Acme HQ',
            tradeName: 'Acme Corporation',
            acronym: 'ACME-HQ',
            status: 'active',
            createdAt: '2010-01-15T00:00:00Z',
            cessationDate: null,
            fieldsOfActivity: 'Headquarters and main operations',
            address: {
              addressLine1: '123 Business St',
              addressLine2: 'Suite 500',
              postalCode: '94102',
              city: 'San Francisco',
              country: 'United States',
              countryCode: 'US',
            },
          },
        ],
        financials: [
          {
            type: 'Annual Report',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            depositDate: '2025-03-15',
            currency: 'USD',
            availability: 'Full',
            ratios: {
              turnover: 25000000,
              grossProfit: 15000000,
              ebitda: 5000000,
              operatingProfit: 4000000,
              netIncome: 3000000,
              exportTurnover: 5000000,
              revenueGrowthRate: 15.5,
              grossMarginRate: 60.0,
              ebitdaMargin: 20.0,
              ebitMargin: 16.0,
              netMargin: 12.0,
              valueAddedRatio: 45.0,
              workingCapitalRequirements: 2000000,
              daySalesOutstanding: 45,
              daysPayableOutstanding: 30,
              netWorkingCapital: 5000000,
              cashFlowFromOperations: 4500000,
              cash: 8000000,
              financialDebt: 2000000,
              netFinancialDebt: -6000000,
              capitalDebtRepaymentCapacity: 2.5,
              gearingRatio: 0.2,
              leverageRatio: 1.5,
              debtsPayableWithinOneYear: 500000,
              debtCoverageRatio: 8.0,
              equity: 10000000,
              returnOnEquity: 30.0,
            },
            relatedDocuments: [
              {
                type: 'Annual Report',
                date: '2024-12-31',
                description: 'Full annual report for fiscal year 2024',
                fileAvailable: true,
                fileFormat: 'PDF',
              },
            ],
          },
        ],
        ubos: [
          {
            firstName: 'John',
            lastName: 'Smith',
            gender: 'male',
            dateOfBirth: '1975-06-15',
            nationality: 'American',
            nationalityCode: 'US',
            percentageOfShares: '60%',
            votingPercentage: '60%',
            address: {
              addressLine1: '456 Oak Avenue',
              addressLine2: null,
              postalCode: '94103',
              city: 'San Francisco',
              country: 'United States',
              countryCode: 'US',
            },
          },
        ],
        officers: [
          {
            type: 'physical',
            role: 'Chief Executive Officer',
            mention: 'Founder',
            appointmentDate: '2010-01-15',
            firstName: 'John',
            lastName: 'Smith',
            gender: 'male',
            dateOfBirth: '1975-06-15',
            nationality: 'American',
            nationalityCode: 'US',
            companyName: null,
            companyNumber: null,
            address: {
              addressLine1: '456 Oak Avenue',
              addressLine2: null,
              postalCode: '94103',
              city: 'San Francisco',
              country: 'United States',
              countryCode: 'US',
            },
          },
          {
            type: 'physical',
            role: 'Chief Financial Officer',
            mention: null,
            appointmentDate: '2015-03-01',
            firstName: 'Sarah',
            lastName: 'Johnson',
            gender: 'female',
            dateOfBirth: '1980-09-22',
            nationality: 'American',
            nationalityCode: 'US',
            companyName: null,
            companyNumber: null,
            address: {
              addressLine1: '789 Pine Street',
              addressLine2: 'Apt 12',
              postalCode: '94104',
              city: 'San Francisco',
              country: 'United States',
              countryCode: 'US',
            },
          },
        ],
      },
      companyMatch: {
        confidenceScore: 95,
        reasoning:
          'High confidence match based on exact name match, address proximity, and website domain verification.',
      },
      enrichmentScore: 85,
    },
    meta: {
      requestId: 'req_abc123',
      processingTimeMs: 1234,
      creditsUsed: 1,
      creditsRemaining: 99,
    },
  },
  '402': {
    success: false,
    error: {
      code: 'INSUFFICIENT_CREDITS',
      message: 'Not enough credits. Please upgrade your plan.',
    },
    meta: {
      requestId: 'req_xyz789',
      processingTimeMs: 50,
    },
  },
  '429': {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded. Please try again later.',
    },
    meta: {
      requestId: 'req_rate123',
      processingTimeMs: 10,
    },
  },
  '500': {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Enrichment failed. Please try again.',
    },
    meta: {
      requestId: 'req_err456',
      processingTimeMs: 500,
    },
  },
}

const statusColors: Record<string, string> = {
  '200': 'text-green-600',
  '402': 'text-yellow-600',
  '429': 'text-yellow-600',
  '500': 'text-red-600',
}

const statusLabels: Record<string, string> = {
  '200': 'Success',
  '402': 'Payment Required',
  '429': 'Rate Limited',
  '500': 'Server Error',
}

interface ResponseViewProps {
  // biome-ignore lint/suspicious/noExplicitAny: JSON schema type
  schema: any
  // biome-ignore lint/suspicious/noExplicitAny: Example response type
  example: any
}

const ResponseView = ({ schema, example }: ResponseViewProps) => {
  return (
    <Tabs defaultValue="docs" className="flex flex-col h-full">
      <TabsList className="w-full justify-start bg-transparent h-auto p-0 border-b shrink-0">
        <TabsTrigger
          value="docs"
          className="gap-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
        >
          <BookOpen className="h-3 w-3" />
          Docs
        </TabsTrigger>
        <TabsTrigger
          value="example"
          className="gap-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
        >
          <Code className="h-3 w-3" />
          Example
        </TabsTrigger>
        <TabsTrigger
          value="schema"
          className="gap-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
        >
          <Braces className="h-3 w-3" />
          Schema
        </TabsTrigger>
      </TabsList>

      {/* Documentation View */}
      <TabsContent value="docs" className="mt-0 flex-1 overflow-hidden min-h-0">
        <div className="border rounded-lg bg-muted/30 h-full overflow-auto">
          {schema ? (
            <SchemaDocView schema={schema} />
          ) : (
            <div className="p-4">
              <JsonTreeViewer
                data={example}
                defaultExpanded={true}
                showRoot={true}
                rootName="response"
              />
            </div>
          )}
        </div>
      </TabsContent>

      {/* Example View */}
      <TabsContent
        value="example"
        className="mt-0 flex-1 overflow-hidden min-h-0"
      >
        <div className="border rounded-lg bg-muted/30 h-full overflow-auto p-4">
          <JsonTreeViewer
            data={example}
            defaultExpanded={true}
            showRoot={true}
            rootName="response"
          />
        </div>
      </TabsContent>

      {/* Raw Schema View */}
      <TabsContent
        value="schema"
        className="mt-0 flex-1 overflow-hidden min-h-0"
      >
        <div className="border rounded-lg bg-muted/30 h-full overflow-auto p-4">
          <JsonTreeViewer
            data={schema}
            rootName="schema"
            defaultExpanded={false}
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}

export const ResponseExamples = () => {
  // Convert schemas to JSON Schema
  const successSchema = useMemo(() => {
    try {
      return zodToJsonSchema(ApiV1CompanyEnrichmentSuccessResponseSchema, {
        target: 'jsonSchema7',
        $refStrategy: 'none',
      })
    } catch {
      return null
    }
  }, [])

  const errorSchema = useMemo(() => {
    try {
      return zodToJsonSchema(ApiV1ErrorResponseSchema, {
        target: 'jsonSchema7',
        $refStrategy: 'none',
      })
    } catch {
      return null
    }
  }, [])

  const getSchemaForStatus = (status: string) => {
    if (status === '200') return successSchema
    return errorSchema
  }

  return (
    <div className="flex flex-col">
      <h3 className="font-medium mb-3">Response Schema</h3>
      <Tabs defaultValue="200" className="flex flex-col">
        <TabsList className="shrink-0">
          {Object.keys(responseExamples).map((status) => (
            <TabsTrigger key={status} value={status} className="gap-1">
              <span className={statusColors[status]}>●</span>
              <span>{status}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(responseExamples).map(([status, example]) => (
          <TabsContent
            key={status}
            value={status}
            className="mt-3 flex flex-col"
          >
            <div className="text-xs text-muted-foreground mb-2">
              {statusLabels[status]}
            </div>
            <div className="min-h-[300px]">
              <ResponseView
                schema={getSchemaForStatus(status)}
                example={example}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
