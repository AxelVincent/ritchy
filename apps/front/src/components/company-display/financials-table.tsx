import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TrendingDown, TrendingUp } from 'lucide-react'

export interface FinancialRatios {
  turnover?: number | null
  exportTurnover?: number | null
  revenueGrowthRate?: number | null
  grossProfit?: number | null
  grossMarginRate?: number | null
  ebitda?: number | null
  ebitdaMargin?: number | null
  operatingProfit?: number | null
  ebitMargin?: number | null
  netIncome?: number | null
  netMargin?: number | null
  returnOnEquity?: number | null
  cash?: number | null
  cashFlowFromOperations?: number | null
  netWorkingCapital?: number | null
  workingCapitalRequirements?: number | null
  daySalesOutstanding?: number | null
  daysPayableOutstanding?: number | null
  financialDebt?: number | null
  netFinancialDebt?: number | null
  debtsPayableWithinOneYear?: number | null
  gearingRatio?: number | null
  leverageRatio?: number | null
  debtCoverageRatio?: number | null
  capitalDebtRepaymentCapacity?: number | null
  equity?: number | null
  valueAddedRatio?: number | null
}

export interface Financial {
  id?: string
  type?: string | null
  currency?: string | null
  startDate?: string | null
  endDate?: string | null
  financialsStartDate?: string | null
  financialsEndDate?: string | null
  depositDate?: string | null
  availability?: string | null
  ratios?: FinancialRatios | null
  relatedDocuments?: Array<{
    type?: string | null
    description?: string | null
    date?: string | null
    fileFormat?: string | null
    fileAvailable?: boolean | null
  }> | null
}

interface FinancialsTableProps {
  financials: Financial[]
}

// Financial metric groups for organization
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

// Percentage metric keys
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

// Ratio metrics (days)
const ratioKeys = ['daySalesOutstanding', 'daysPayableOutstanding']

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
  value: number | null | undefined,
  currency?: string | null,
): string => {
  if (value === null || value === undefined) return '—'
  if (value === 0) return '—'

  if (percentageKeys.includes(key)) {
    return `${value.toFixed(2)}%`
  }

  if (ratioKeys.includes(key)) {
    return `${value.toFixed(1)} days`
  }

  if (currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

// Format date range
const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
}

// Get fiscal year from date
const getFiscalYear = (end: string): number => {
  return new Date(end).getFullYear()
}

// Check if value is positive/negative for styling
const getValueTrend = (
  key: string,
  value: number | null | undefined,
): 'positive' | 'negative' | 'neutral' => {
  if (value === null || value === undefined || value === 0) return 'neutral'

  const positiveGoodKeys = [
    'revenueGrowthRate',
    'grossMarginRate',
    'ebitdaMargin',
    'ebitMargin',
    'netMargin',
    'returnOnEquity',
    'grossProfit',
    'ebitda',
    'operatingProfit',
    'netIncome',
    'cash',
    'cashFlowFromOperations',
    'equity',
  ]

  const negativeGoodKeys = [
    'financialDebt',
    'netFinancialDebt',
    'debtsPayableWithinOneYear',
    'gearingRatio',
    'leverageRatio',
  ]

  if (positiveGoodKeys.includes(key)) {
    return value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
  }

  if (negativeGoodKeys.includes(key)) {
    return value < 0 ? 'positive' : 'neutral'
  }

  return 'neutral'
}

export const FinancialsTable = ({ financials }: FinancialsTableProps) => {
  if (!financials || financials.length === 0) {
    return null
  }

  // Get all available ratio keys
  const allRatioKeys = new Set<string>()
  for (const financial of financials) {
    if (financial.ratios) {
      for (const key of Object.keys(financial.ratios)) {
        const value = financial.ratios[key as keyof FinancialRatios]
        if (value !== null && value !== undefined && value !== 0) {
          allRatioKeys.add(key)
        }
      }
    }
  }

  if (allRatioKeys.size === 0) {
    return null
  }

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

  // Get primary currency
  const primaryCurrency = financials[0]?.currency || ''

  // Get dates - support both naming conventions
  const getStartDate = (f: Financial) => f.startDate || f.financialsStartDate
  const getEndDate = (f: Financial) => f.endDate || f.financialsEndDate

  return (
    <div className="space-y-4">
      {/* Header Card */}
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
          {/* Period headers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {financials.map((financial, index) => {
              const endDate = getEndDate(financial)
              const startDate = getStartDate(financial)
              const fiscalYear = endDate ? getFiscalYear(endDate) : index + 1
              return (
                <div
                  key={`period-${fiscalYear}-${financial.type || index}`}
                  className="border rounded-lg p-3 bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold">
                      {financial.type || `FY ${fiscalYear}`}
                    </p>
                    {financial.currency && (
                      <Badge variant="secondary" className="text-xs">
                        {financial.currency}
                      </Badge>
                    )}
                  </div>
                  {startDate && endDate && (
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(startDate, endDate)}
                    </p>
                  )}
                  {financial.depositDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Deposited:{' '}
                      {new Date(financial.depositDate).toLocaleDateString()}
                    </p>
                  )}
                  {financial.availability && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {financial.availability}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Financial Metrics Tables */}
      {organizedMetrics.map((group) => (
        <Card key={group.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              {group.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                        Metric
                      </th>
                      {financials.map((financial, index) => {
                        const endDate = getEndDate(financial)
                        const fiscalYear = endDate
                          ? getFiscalYear(endDate)
                          : 'N/A'
                        const headerKey = `header-${fiscalYear}-${financial.type || getStartDate(financial) || index}`
                        return (
                          <th
                            key={headerKey}
                            className="text-right text-xs px-4 py-3 min-w-[100px]"
                          >
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="font-semibold text-foreground">
                                {fiscalYear}
                              </span>
                              <span className="text-muted-foreground font-normal">
                                {financial.type || `FY ${fiscalYear}`}
                              </span>
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {group.metrics.map((key, rowIndex) => (
                      <tr
                        key={key}
                        className={cn(
                          'border-b last:border-0 transition-colors hover:bg-muted/30',
                          rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                        )}
                      >
                        <td className="text-xs font-medium px-4 py-2.5 text-foreground">
                          {formatKey(key)}
                        </td>
                        {financials.map((financial, index) => {
                          const value =
                            financial.ratios?.[key as keyof FinancialRatios] ??
                            null
                          const trend = getValueTrend(key, value)
                          const formattedValue = formatValue(
                            key,
                            value,
                            financial.currency,
                          )
                          const isEmpty = formattedValue === '—'
                          const endDate = getEndDate(financial)
                          const fiscalYear = endDate
                            ? getFiscalYear(endDate)
                            : 'N/A'
                          const cellKey = `cell-${key}-${fiscalYear}-${financial.type || index}`

                          return (
                            <td
                              key={cellKey}
                              className={cn(
                                'text-xs text-right font-mono px-4 py-2.5',
                                isEmpty && 'text-muted-foreground/50',
                                !isEmpty &&
                                  trend === 'positive' &&
                                  'text-green-600 dark:text-green-400',
                                !isEmpty &&
                                  trend === 'negative' &&
                                  'text-red-600 dark:text-red-400',
                              )}
                            >
                              <span className="inline-flex items-center gap-1">
                                {formattedValue}
                                {!isEmpty && trend === 'positive' && (
                                  <TrendingUp className="h-3 w-3" />
                                )}
                                {!isEmpty && trend === 'negative' && (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Related Documents */}
      {financials.some(
        (f) => f.relatedDocuments && f.relatedDocuments.length > 0,
      ) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {financials.map((financial, fIndex) => {
                if (
                  !financial.relatedDocuments ||
                  financial.relatedDocuments.length === 0
                ) {
                  return null
                }
                const endDate = getEndDate(financial)
                const fiscalYear = endDate ? getFiscalYear(endDate) : 'N/A'
                const docsKey = `docs-${fiscalYear}-${financial.type || getStartDate(financial) || fIndex}`
                return (
                  <div key={docsKey}>
                    <p className="text-sm font-medium mb-2">
                      {financial.type || `FY ${fiscalYear}`}
                    </p>
                    <div className="space-y-2">
                      {financial.relatedDocuments.map((doc, dIndex) => (
                        <div
                          key={`doc-${fiscalYear}-${doc.type || dIndex}`}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div>
                            <p className="text-sm">{doc.type || 'Document'}</p>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground">
                                {doc.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.date && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(doc.date).toLocaleDateString()}
                              </span>
                            )}
                            {doc.fileFormat && (
                              <Badge variant="outline" className="text-xs">
                                {doc.fileFormat}
                              </Badge>
                            )}
                            {doc.fileAvailable && (
                              <Badge variant="secondary" className="text-xs">
                                Available
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
