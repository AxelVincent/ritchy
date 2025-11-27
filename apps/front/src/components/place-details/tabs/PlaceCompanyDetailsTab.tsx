import { usePlaceEnrichmentQuery } from '@/api/queries/places/enrichment/usePlaceEnrichment'
import { EnrichmentAwareEmptyState } from '@/components/enrichment'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Financial, Place } from '@ritchy/types'
import {
  Building,
  Calendar,
  ChevronDown,
  ChevronRight,
  Code,
  Globe,
  Hash,
  Loader2,
  MapPin,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

// Financial Data Component - Organized by category with proper formatting
const FinancialsTable = ({ financials }: { financials: Financial }) => {
  if (!financials || financials.length === 0) return null

  // Define metric groups for better organization
  const metricGroups = {
    revenue: {
      label: 'Revenue & Sales',
      keys: ['turnover', 'exportTurnover', 'revenueGrowthRate'],
    },
    profitability: {
      label: 'Profitability',
      keys: [
        'grossProfit',
        'grossMarginRate',
        'ebitda',
        'ebitdaMargin',
        'operatingProfit',
        'ebitMargin',
        'netIncome',
        'netMargin',
        'returnOnEquity',
      ],
    },
    liquidity: {
      label: 'Liquidity & Working Capital',
      keys: [
        'cash',
        'cashFlowFromOperations',
        'netWorkingCapital',
        'workingCapitalRequirements',
        'daySalesOutstanding',
        'daysPayableOutstanding',
      ],
    },
    debt: {
      label: 'Debt & Leverage',
      keys: [
        'financialDebt',
        'netFinancialDebt',
        'debtsPayableWithinOneYear',
        'gearingRatio',
        'leverageRatio',
        'debtCoverageRatio',
        'capitalDebtRepaymentCapacity',
      ],
    },
    equity: {
      label: 'Equity & Value',
      keys: ['equity', 'valueAddedRatio'],
    },
  }

  // Get all available ratio keys
  const allRatioKeys = new Set<string>()
  for (const financial of financials) {
    if (financial.ratios) {
      for (const key of Object.keys(financial.ratios)) {
        const value = financial.ratios[key as keyof typeof financial.ratios]
        if (value !== null && value !== undefined && value !== 0) {
          allRatioKeys.add(key)
        }
      }
    }
  }

  if (allRatioKeys.size === 0) return null

  // Organize metrics into groups
  const organizedMetrics = Object.entries(metricGroups)
    .map(([groupKey, group]) => {
      const availableKeys = group.keys.filter((key) => allRatioKeys.has(key))
      return {
        ...group,
        key: groupKey,
        metrics: availableKeys,
      }
    })
    .filter((group) => group.metrics.length > 0)

  // Get primary currency (use first financial's currency)
  const primaryCurrency = financials[0]?.currency || ''

  // Get fiscal year from date range (typically the end year)
  const getFiscalYear = (_start: string, end: string): number => {
    const endDate = new Date(end)
    return endDate.getFullYear()
  }

  // Format date range
  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const startYear = startDate.getFullYear()
    const endYear = endDate.getFullYear()
    if (startYear === endYear) {
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  // Format metric key to readable label
  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }

  // Format value based on metric type
  const formatValue = (
    key: string,
    value: unknown,
    currency?: string,
  ): string => {
    if (typeof value !== 'number') return '-'
    if (value === 0) return '-'

    // Percentage metrics
    const percentageKeys = [
      'revenueGrowthRate',
      'grossMarginRate',
      'ebitdaMargin',
      'ebitMargin',
      'netMargin',
      'returnOnEquity',
      'valueAddedRatio',
      'gearingRatio',
      'leverageRatio',
      'debtCoverageRatio',
    ]
    if (percentageKeys.includes(key)) {
      return `${value.toFixed(2)}%`
    }

    // Ratio metrics (days)
    const ratioKeys = ['daySalesOutstanding', 'daysPayableOutstanding']
    if (ratioKeys.includes(key)) {
      return `${value.toFixed(1)} days`
    }

    // Currency metrics
    if (currency) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    }

    // Default number formatting
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Financial Data
          </CardTitle>
          {primaryCurrency && (
            <Badge variant="outline">{primaryCurrency}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Period headers */}
          <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-3">
            {financials.map((financial, index) => (
              <div
                key={financial.id || index}
                className="border rounded-lg p-3 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold">
                    {financial.type || `Period ${index + 1}`}
                  </p>
                  {financial.currency && (
                    <Badge variant="secondary">{financial.currency}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateRange(
                    financial.financialsStartDate,
                    financial.financialsEndDate,
                  )}
                </p>
                {financial.depositDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Deposited:{' '}
                    {new Date(financial.depositDate).toLocaleDateString()}
                  </p>
                )}
                {financial.availability && (
                  <Badge variant="outline" className="mt-1">
                    {financial.availability}
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Financial Metrics - All groups displayed */}
          <div className="space-y-6">
            {organizedMetrics.map((group) => (
              <div key={group.key} className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  {group.label}
                </h4>
                <div className="border rounded-lg bg-muted/30 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Metric</TableHead>
                        {financials.map((financial, index) => {
                          const fiscalYear = getFiscalYear(
                            financial.financialsStartDate,
                            financial.financialsEndDate,
                          )
                          return (
                            <TableHead
                              key={financial.id || index}
                              className="text-xs text-right"
                            >
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="font-semibold text-foreground">
                                  {fiscalYear}
                                </span>
                                <span className="text-muted-foreground font-normal">
                                  {financial.type || `FY ${fiscalYear}`}
                                </span>
                              </div>
                            </TableHead>
                          )
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.metrics.map((key) => (
                        <TableRow key={key}>
                          <TableCell className="text-xs font-medium">
                            {formatKey(key)}
                          </TableCell>
                          {financials.map((financial, index) => (
                            <TableCell
                              key={financial.id || index}
                              className="text-xs text-right font-mono"
                            >
                              {formatValue(
                                key,
                                financial.ratios?.[
                                  key as keyof typeof financial.ratios
                                ],
                                financial.currency,
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Company Identifiers Card - Shows basic info prominently
const CompanyIdentifiersCard = ({
  place,
  company,
  enrichment,
}: {
  place: Place
  company?: {
    name: string
    companyNumber: string
    status: string
    workforceRange?: string
    confidenceScore?: number
    reasoning?: string
  }
  enrichment?: {
    domain: string
  }
}) => {
  const [isReasoningOpen, setIsReasoningOpen] = useState(false)

  if (!company) return null

  const companyNameDiffers = company.name && company.name !== place.name

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4" />
            Company Identifiers
          </CardTitle>
          {company.confidenceScore !== undefined && (
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {company.confidenceScore}% confidence
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Matching Reasoning - Associated with confidence score */}
        {company.reasoning && (
          <div className="mb-4 pb-4 border-b">
            <Collapsible
              open={isReasoningOpen}
              onOpenChange={setIsReasoningOpen}
            >
              <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 w-full text-left">
                {isReasoningOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <span>Matching reasoning</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-xs text-muted-foreground pl-4">
                {company.reasoning}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-4">
          {/* Company Name - Only show if different from place name */}
          {companyNameDiffers && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Company Name</p>
              <p className="text-sm font-semibold">{company.name}</p>
            </div>
          )}

          {/* Company Number */}
          {company.companyNumber && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Company Number
              </p>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-mono">{company.companyNumber}</p>
              </div>
            </div>
          )}

          {/* Domain */}
          {enrichment?.domain && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Domain</p>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`https://${enrichment.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {enrichment.domain}
                </a>
              </div>
            </div>
          )}

          {/* Status */}
          {company.status && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge
                variant={company.status === 'ACTIVE' ? 'default' : 'secondary'}
              >
                {company.status}
              </Badge>
            </div>
          )}

          {/* Workforce Range */}
          {company.workforceRange && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Workforce</p>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{company.workforceRange}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Enrichment Info Card - Prominent, always visible
const EnrichmentInfoCard = ({
  enrichment,
}: {
  enrichment: {
    id: string
    description: string
    shortDescription: string
    domain: string
    domainRegisteredAt: string
    success: boolean
    technologies?: Array<{
      technology: string
      category: string
    }>
  }
}) => {
  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Enrichment Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Description - Full text, prominent */}
        {enrichment.description && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Company Description</h4>
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
              <ReactMarkdown>{enrichment.description}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Domain Info */}
        <div className="grid grid-cols-1 @md:grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Domain</p>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a
                href={`https://${enrichment.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                {enrichment.domain || 'N/A'}
              </a>
            </div>
          </div>
          {enrichment.domainRegisteredAt && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Domain Registered
              </p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">
                  {new Date(enrichment.domainRegisteredAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Technologies Section */}
        {enrichment.technologies && enrichment.technologies.length > 0 && (
          <div className="pt-4 border-t">
            <TechnologiesSection technologies={enrichment.technologies} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Company Overview Card
const CompanyOverviewCard = ({
  company,
}: {
  company: {
    tradeName?: string
    acronym?: string
    country: string
    countryCode: string
    type: string
    dateOfCreation: string
    dateOfCessation?: string
    workforce?: number
  }
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building className="h-4 w-4" />
          Additional Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
          {company.tradeName && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Trade Name</p>
              <p className="text-sm">{company.tradeName}</p>
            </div>
          )}

          {company.acronym && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Acronym</p>
              <p className="text-sm font-mono">{company.acronym}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-1">Country</p>
            <p className="text-sm">
              {company.country} ({company.countryCode})
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Type</p>
            <p className="text-sm">{company.type || 'N/A'}</p>
          </div>

          {company.dateOfCreation && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Date of Creation
              </p>
              <p className="text-sm">
                {new Date(company.dateOfCreation).toLocaleDateString()}
              </p>
            </div>
          )}

          {company.workforce && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Workforce Count
              </p>
              <p className="text-sm">{company.workforce.toLocaleString()}</p>
            </div>
          )}

          {company.dateOfCessation && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Date of Cessation
              </p>
              <p className="text-sm text-destructive">
                {new Date(company.dateOfCessation).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Legal & Registration Card
const LegalRegistrationCard = ({
  company,
}: {
  company: {
    legalFormCode?: string
    localLegalFormCode?: string
    localLegalFormName?: string
    commercialRegisterRegistrationStatus?: string
    commercialRegisterRegistrationDate?: string
    commercialRegisterRegistrationNumber?: string
    commercialRegisterCessationDate?: string
  }
}) => {
  const hasLegalInfo =
    company.legalFormCode ||
    company.localLegalFormName ||
    company.commercialRegisterRegistrationStatus

  if (!hasLegalInfo) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Legal & Registration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {company.localLegalFormName && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Legal Form</p>
            <p className="text-sm">{company.localLegalFormName}</p>
            {company.legalFormCode && (
              <p className="text-xs text-muted-foreground mt-1">
                Code: {company.legalFormCode}
              </p>
            )}
          </div>
        )}

        {company.commercialRegisterRegistrationStatus && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Registration Status
            </p>
            <Badge variant="outline">
              {company.commercialRegisterRegistrationStatus}
            </Badge>
          </div>
        )}

        {company.commercialRegisterRegistrationNumber && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Registration Number
            </p>
            <p className="text-sm font-mono">
              {company.commercialRegisterRegistrationNumber}
            </p>
          </div>
        )}

        {company.commercialRegisterRegistrationDate && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Registration Date
            </p>
            <p className="text-sm">
              {new Date(
                company.commercialRegisterRegistrationDate,
              ).toLocaleDateString()}
            </p>
          </div>
        )}

        {company.commercialRegisterCessationDate && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Cessation Date</p>
            <p className="text-sm text-destructive">
              {new Date(
                company.commercialRegisterCessationDate,
              ).toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Address Card
const AddressCard = ({
  company,
}: {
  company: {
    headOfficeAddressLine1?: string
    headOfficeAddressLine2?: string
    headOfficePostalCode?: string
    headOfficeCity?: string
    headOfficeCountry?: string
    headOfficeCountryCode?: string
  }
}) => {
  const addressParts = [
    company.headOfficeAddressLine1,
    company.headOfficeAddressLine2,
    company.headOfficePostalCode,
    company.headOfficeCity,
    company.headOfficeCountry,
  ].filter(Boolean)

  if (addressParts.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Head Office Address
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{addressParts.join(', ')}</p>
        {company.headOfficeCountryCode && (
          <p className="text-xs text-muted-foreground mt-1">
            Country Code: {company.headOfficeCountryCode}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Capital & Fiscal Card
const CapitalFiscalCard = ({
  company,
}: {
  company: {
    shareCapital?: string
    shareCapitalCurrency?: string
    fiscalYearEnd?: string
    nextFiscalYearEnd?: string
  }
}) => {
  const hasCapitalInfo =
    company.shareCapital || company.fiscalYearEnd || company.nextFiscalYearEnd

  if (!hasCapitalInfo) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Capital & Fiscal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {company.shareCapital && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Share Capital</p>
            <p className="text-sm font-medium">
              {company.shareCapital} {company.shareCapitalCurrency || ''}
            </p>
          </div>
        )}

        {company.fiscalYearEnd && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Fiscal Year End
            </p>
            <p className="text-sm">{company.fiscalYearEnd}</p>
          </div>
        )}

        {company.nextFiscalYearEnd && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Next Fiscal Year End
            </p>
            <p className="text-sm">{company.nextFiscalYearEnd}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// UBO Section
const UBOSection = ({
  ubos,
}: {
  ubos: Array<{
    id: string
    lastName: string
    firstName: string
    percentageOfShares?: string
    votingPercentage?: string
    nationality?: string
    country?: string
  }>
}) => {
  const [expandedUbos, setExpandedUbos] = useState<Set<string>>(new Set())

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Ultimate Beneficial Owners ({ubos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {ubos.map((ubo) => {
            const isExpanded = expandedUbos.has(ubo.id)
            return (
              <Collapsible
                key={ubo.id}
                open={isExpanded}
                onOpenChange={(open) => {
                  setExpandedUbos((prev) => {
                    const next = new Set(prev)
                    if (open) {
                      next.add(ubo.id)
                    } else {
                      next.delete(ubo.id)
                    }
                    return next
                  })
                }}
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {ubo.firstName} {ubo.lastName}
                    </span>
                    {ubo.percentageOfShares && (
                      <Badge variant="secondary">
                        {ubo.percentageOfShares}% shares
                      </Badge>
                    )}
                    {ubo.votingPercentage && (
                      <Badge variant="outline">
                        {ubo.votingPercentage}% voting
                      </Badge>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 pt-2 space-y-2">
                  {ubo.nationality && (
                    <p className="text-xs text-muted-foreground">
                      Nationality: {ubo.nationality}
                    </p>
                  )}
                  {ubo.country && (
                    <p className="text-xs text-muted-foreground">
                      Country: {ubo.country}
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Company Contacts Section
const CompanyContactsSection = ({
  contacts,
}: {
  contacts: Array<{ id: string; type: string; value: string }>
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Company Contacts ({contacts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {contacts.map((contact) => (
            <Badge key={contact.id} variant="secondary" className="gap-1">
              <span className="text-xs text-muted-foreground">
                {contact.type}:
              </span>
              <span>{contact.value}</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Establishments Section
const EstablishmentsSection = ({
  establishments,
}: {
  establishments: Array<{
    id: string
    number: string
    name: string
    tradeName?: string
    acronym?: string
    fieldsOfActivity?: string
    dateOfCreation?: string
    status: string
    dateOfCessation?: string
    addressLine1?: string
    addressLine2?: string
    postalCode?: string
    city?: string
    country?: string
    countryCode?: string
  }>
}) => {
  const [expandedEst, setExpandedEst] = useState<Set<string>>(new Set())

  const formatAddress = (est: (typeof establishments)[0]) => {
    const parts = [
      est.addressLine1,
      est.addressLine2,
      est.postalCode,
      est.city,
      est.country,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building className="h-4 w-4" />
          Establishments ({establishments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {establishments.map((est) => {
            const isExpanded = expandedEst.has(est.id)
            const address = formatAddress(est)
            const displayName = est.tradeName || est.name

            return (
              <Collapsible
                key={est.id}
                open={isExpanded}
                onOpenChange={(open) => {
                  setExpandedEst((prev) => {
                    const next = new Set(prev)
                    if (open) {
                      next.add(est.id)
                    } else {
                      next.delete(est.id)
                    }
                    return next
                  })
                }}
              >
                <CollapsibleTrigger className="w-full flex items-start justify-between p-3 hover:bg-muted/50 rounded-lg border transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <p className="text-sm font-semibold">{displayName}</p>
                      {est.acronym && (
                        <Badge variant="outline">{est.acronym}</Badge>
                      )}
                      <Badge
                        variant={
                          est.status === 'ACTIVE' ? 'default' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {est.status}
                      </Badge>
                    </div>
                    {address && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{address}</span>
                      </div>
                    )}
                    {est.number && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Number: {est.number}
                      </p>
                    )}
                  </div>
                  <div className="ml-2 flex-shrink-0 pt-0.5">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-3 pr-3 pt-3 pb-2 space-y-3 border-l-2 border-muted ml-3">
                  {/* Full Name if different from trade name */}
                  {est.tradeName && est.name !== est.tradeName && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Legal Name
                      </p>
                      <p className="text-sm">{est.name}</p>
                    </div>
                  )}

                  {/* Fields of Activity */}
                  {est.fieldsOfActivity && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Fields of Activity
                      </p>
                      <p className="text-sm">{est.fieldsOfActivity}</p>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-1 @md:grid-cols-2 gap-3">
                    {est.dateOfCreation && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Date of Creation
                        </p>
                        <p className="text-sm">
                          {new Date(est.dateOfCreation).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {est.dateOfCessation && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Date of Cessation
                        </p>
                        <p className="text-sm text-destructive">
                          {new Date(est.dateOfCessation).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Full Address Details */}
                  {(est.addressLine1 ||
                    est.addressLine2 ||
                    est.postalCode ||
                    est.city ||
                    est.country) && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Full Address
                      </p>
                      <div className="text-sm space-y-0.5">
                        {est.addressLine1 && <p>{est.addressLine1}</p>}
                        {est.addressLine2 && <p>{est.addressLine2}</p>}
                        <p>
                          {[
                            est.postalCode,
                            est.city,
                            est.country,
                            est.countryCode && `(${est.countryCode})`,
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        </p>
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Activities Section
const ActivitiesSection = ({
  activities,
}: {
  activities: Array<{
    id: string
    code: string
    name: string
    type: string
    classification: string
  }>
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Business Activities ({activities.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {activities.map((activity) => (
            <Badge key={activity.id} variant="outline" className="gap-1">
              <span className="font-mono text-xs">{activity.code}</span>
              <span className="text-xs">·</span>
              <span>{activity.name}</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Technologies Section
const TechnologiesSection = ({
  technologies,
}: {
  technologies: Array<{
    technology: string
    category: string
  }>
}) => {
  // Group technologies by category
  const groupedByCategory = technologies.reduce(
    (acc, tech) => {
      if (!acc[tech.category]) {
        acc[tech.category] = []
      }
      acc[tech.category].push(tech)
      return acc
    },
    {} as Record<string, typeof technologies>,
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Code className="h-3.5 w-3.5" />
          Technologies ({technologies.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 @sm:grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4 gap-4">
          {Object.entries(groupedByCategory).map(([category, techs]) => (
            <div key={category} className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {category}
              </span>
              <div className="flex flex-col gap-1.5">
                {techs.map((tech, index) => (
                  <Badge
                    key={`${tech.technology}-${tech.category}-${index}`}
                    variant="outline"
                    className="text-xs py-1 px-2 w-fit"
                  >
                    {tech.technology}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Main Component
export const PlaceCompanyDetailsTab = ({ place }: { place: Place }) => {
  const { data, isLoading, error } = usePlaceEnrichmentQuery(place.id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Error loading enrichment: {error.message}
      </div>
    )
  }

  const hasData = data && !('error' in data) && data?.id !== null

  return (
    <>
      <EnrichmentAwareEmptyState placeId={place.id} hasData={!!hasData} />

      {hasData && data && !('error' in data) && (
        <div className="h-full flex flex-col">
          <ScrollArea className="flex-1">
            <div className="@container pr-4 space-y-4">
              {/* 1. Company Identifiers - Prominent at top */}
              {data.company && (
                <CompanyIdentifiersCard
                  place={place}
                  company={data.company}
                  enrichment={data.enrichment}
                />
              )}

              {/* 2. Prominent Enrichment Info */}
              {data.enrichment && (
                <EnrichmentInfoCard enrichment={data.enrichment} />
              )}

              {/* 3. Company Details Sections */}
              {data.company && (
                <>
                  {/* Additional Details + Head Office Address - Side by side when available */}
                  <div className="grid grid-cols-1 @lg:grid-cols-2 gap-4">
                    <CompanyOverviewCard company={data.company} />
                    <AddressCard company={data.company} />
                  </div>

                  {/* Legal & Registration + Capital & Fiscal - Side by side when available */}
                  <div className="grid grid-cols-1 @lg:grid-cols-2 gap-4">
                    <LegalRegistrationCard company={data.company} />
                    <CapitalFiscalCard company={data.company} />
                  </div>

                  {data.company.ubos && data.company.ubos.length > 0 && (
                    <UBOSection ubos={data.company.ubos} />
                  )}

                  {data.company.contacts &&
                    data.company.contacts.length > 0 && (
                      <CompanyContactsSection
                        contacts={data.company.contacts}
                      />
                    )}

                  {/* Establishments + Business Activities - Side by side when available */}
                  {(data.company.establishments?.length > 0 ||
                    data.company.activities?.length > 0) && (
                    <div className="grid grid-cols-1 @lg:grid-cols-2 gap-4">
                      {data.company.establishments &&
                        data.company.establishments.length > 0 && (
                          <EstablishmentsSection
                            establishments={data.company.establishments}
                          />
                        )}

                      {data.company.activities &&
                        data.company.activities.length > 0 && (
                          <ActivitiesSection
                            activities={data.company.activities}
                          />
                        )}
                    </div>
                  )}

                  {data.company.financials &&
                    data.company.financials.length > 0 && (
                      <FinancialsTable financials={data.company.financials} />
                    )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </>
  )
}
