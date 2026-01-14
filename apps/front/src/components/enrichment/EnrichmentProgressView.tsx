import { Progress } from '@/components/ui/progress'
import type { EnrichmentStatusResponse } from '@api/routes_web/enrich/shared'
import { Clock, Loader2 } from 'lucide-react'

interface EnrichmentProgressViewProps {
  status: EnrichmentStatusResponse
}

export const EnrichmentProgressView = ({
  status,
}: EnrichmentProgressViewProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          {status.status === 'queued' ? (
            <>
              <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Enrichment Queued</h3>
              <p className="text-sm text-muted-foreground">
                Your enrichment request is in the queue and will start
                shortly...
              </p>
            </>
          ) : (
            <>
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Enriching Company Data</h3>
            </>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{status.progress}%</span>
          </div>
          <Progress value={status.progress} className="h-2" />
        </div>

        {status.status === 'processing' && status.step && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Current Step:</p>
            <p className="text-sm font-medium">{status.step}</p>
          </div>
        )}

        <div className="text-xs text-center text-muted-foreground">
          This page will automatically update when enrichment completes
        </div>
      </div>
    </div>
  )
}
