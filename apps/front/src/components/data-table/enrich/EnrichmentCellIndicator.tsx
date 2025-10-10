import type { EnrichmentStatusResponse } from '@ritchy/types'
import { Clock, Loader2, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

interface EnrichmentCellIndicatorProps {
  status?: EnrichmentStatusResponse
  children: ReactNode
}

export const EnrichmentCellIndicator = ({
  status,
  children,
}: EnrichmentCellIndicatorProps) => {
  if (!status) return <>{children}</>

  switch (status.status) {
    case 'queued':
      return (
        <div className="flex items-center gap-1.5 w-full px-2 py-1 border-l-2">
          <Clock className="h-3 w-3 text-blue-500 shrink-0" />
          <span className="text-xs text-blue-600 truncate">Queued...</span>
        </div>
      )

    case 'processing':
      return (
        <div className="flex flex-col gap-0.5 w-full px-2 py-0.5 border-l-">
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 text-blue-500 animate-spin shrink-0" />
            <span
              className="text-xs text-blue-600 truncate flex-1"
              title={status.step || 'Processing...'}
            >
              {status.step || 'Processing...'}
            </span>
            <span className="text-xs text-blue-500 shrink-0">
              {status.progress}%
            </span>
          </div>
          <div className="w-full h-0.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>
      )

    case 'failed':
      return (
        <div className="flex items-center gap-1.5 w-full px-2 py-1 border-l-2">
          <XCircle className="h-3 w-3 text-red-500 shrink-0" />
          <span
            className="text-xs text-red-600 truncate"
            title={status.error || 'Failed'}
          >
            {status.error || 'Failed'}
          </span>
        </div>
      )

    default:
      return <>{children}</>
  }
}
