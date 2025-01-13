import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusIndicatorProps {
  isOpen: boolean | undefined
}

export const StatusIndicator = ({ isOpen }: StatusIndicatorProps) => (
  <div className="flex items-center gap-2">
    <Badge
      variant="secondary"
      className={cn(
        'transition-none hover:bg-none whitespace-nowrap',
        isOpen
          ? 'bg-green-600 text-white hover:bg-green-600'
          : 'bg-red-600 text-white hover:bg-red-600',
      )}
    >
      {isOpen ? 'Open now' : 'Closed'}
    </Badge>
  </div>
)
