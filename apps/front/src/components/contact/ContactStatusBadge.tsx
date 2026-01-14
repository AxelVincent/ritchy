import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { EnrichmentStatusResponse } from '@api/routes_web/enrich/shared'
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  Loader2,
  XCircle,
} from 'lucide-react'

interface ContactStatusBadgeProps {
  status: EnrichmentStatusResponse | null | undefined
  showProgress?: boolean
  className?: string
}

type StatusKey = 'idle' | 'queued' | 'processing' | 'completed' | 'failed'

interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>
  label: string
  variant: BadgeProps['variant']
  iconClass: string
}

const statusConfig: Record<StatusKey, StatusConfig> = {
  idle: {
    icon: CircleDashed,
    label: 'Not enriched',
    variant: 'secondary',
    iconClass: 'text-muted-foreground',
  },
  queued: {
    icon: Clock,
    label: 'Queued',
    variant: 'outline',
    iconClass: 'text-yellow-500',
  },
  processing: {
    icon: Loader2,
    label: 'Enriching',
    variant: 'outline',
    iconClass: 'text-blue-500 animate-spin',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Enriched',
    variant: 'emerald',
    iconClass: 'text-emerald-600',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    variant: 'destructive',
    iconClass: 'text-red-500',
  },
}

/**
 * Badge component to display contact enrichment status
 */
export const ContactStatusBadge = ({
  status,
  showProgress = true,
  className,
}: ContactStatusBadgeProps) => {
  const statusKey: StatusKey = (status?.status as StatusKey) || 'idle'
  const config = statusConfig[statusKey]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      <Icon className={cn('h-3 w-3', config.iconClass)} aria-hidden="true" />
      <span>
        {config.label}
        {showProgress && statusKey === 'processing' && status?.progress
          ? ` ${status.progress}%`
          : ''}
      </span>
    </Badge>
  )
}
