import { FinancialsTable } from '@/components/company-display'
import type { ApiV1CompanyEnrichmentSuccessResponse } from '@api/routes_api/v1/enrich/contract'

interface FinancialsPanelProps {
  response: ApiV1CompanyEnrichmentSuccessResponse
}

export const FinancialsPanel = ({ response }: FinancialsPanelProps) => {
  const { registry } = response.data
  const financials = registry?.financials

  if (!financials || financials.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <p>No financial data available</p>
      </div>
    )
  }

  return <FinancialsTable financials={financials} />
}
