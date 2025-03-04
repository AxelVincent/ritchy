import { cn } from '@/lib/utils'
import type { StatusType } from '@ritchy/types'
import { Badge } from '../ui/badge'
import { getStatusColor } from './status-colors'
import { getStatusLabel } from './status-label'

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className={cn(
        getStatusColor(status),
        'font-medium px-3 py-1 rounded-full border',
        className,
      )}
    >
      {getStatusLabel(status)}
    </Badge>
  )
}
