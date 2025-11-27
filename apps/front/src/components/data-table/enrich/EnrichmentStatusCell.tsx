import { useEnrichmentStatus } from '@/api/queries/enrichment/useEnrichmentStatus'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  Loader2,
  XCircle,
} from 'lucide-react'

interface EnrichmentStatusCellProps {
  userPlaceId: string
}

export const EnrichmentStatusCell = ({
  userPlaceId,
}: EnrichmentStatusCellProps) => {
  const { data: status } = useEnrichmentStatus(userPlaceId)

  if (!status) return null

  switch (status.status) {
    case 'idle':
      return (
        <div className="flex items-center gap-1.5">
          <CircleDashed className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">Not started</span>
        </div>
      )

    case 'queued':
      return (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <Badge variant="secondary">Queued</Badge>
        </div>
      )

    case 'processing':
      return (
        <div className="flex flex-col gap-1 w-full max-w-[180px]">
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />
            <span className="text-xs font-medium">Processing</span>
            <span className="text-xs text-muted-foreground ml-auto shrink-0">
              {status.progress}%
            </span>
          </div>
          <Progress value={status.progress} className="h-1" />
          {status.step && (
            <span
              className="text-xs text-muted-foreground truncate"
              title={status.step}
            >
              {status.step}
            </span>
          )}
        </div>
      )

    case 'completed':
      return (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
          <Badge variant="emerald">Completed</Badge>
        </div>
      )

    case 'failed':
      return (
        <div className="flex flex-col gap-0.5 w-full max-w-[180px]">
          <div className="flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <Badge variant="destructive">Failed</Badge>
          </div>
          {status.error && (
            <span
              className="text-xs text-red-600 truncate"
              title={status.error}
            >
              {status.error}
            </span>
          )}
        </div>
      )

    default:
      return null
  }
}
