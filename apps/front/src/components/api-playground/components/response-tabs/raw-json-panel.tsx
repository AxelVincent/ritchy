import { JsonTreeViewer } from '@/components/ui/json-tree-viewer'
import type { ApiV1CompanyEnrichmentSuccessResponse } from '@api/routes_api/v1/enrich/contract'

interface RawJsonPanelProps {
  response: ApiV1CompanyEnrichmentSuccessResponse
}

export const RawJsonPanel = ({ response }: RawJsonPanelProps) => {
  return (
    <div className="bg-muted/30 rounded-lg p-4 overflow-auto">
      <JsonTreeViewer data={response} showRoot={true} rootName="res" />
    </div>
  )
}
