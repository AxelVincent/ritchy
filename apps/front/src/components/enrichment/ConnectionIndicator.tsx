import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { cn } from '@/lib/utils'
import { Loader2, Wifi, WifiOff } from 'lucide-react'

interface ConnectionIndicatorProps {
  className?: string
}

/**
 * WebSocket connection status indicator
 * Shows whether live updates are active
 */
export const ConnectionIndicator = ({
  className,
}: ConnectionIndicatorProps) => {
  const { status } = useWebSocket()

  const config = {
    connected: {
      icon: Wifi,
      color: 'text-green-500',
      dotColor: 'bg-green-500',
      label: 'Live updates active',
      animate: false,
    },
    connecting: {
      icon: Loader2,
      color: 'text-yellow-500',
      dotColor: 'bg-yellow-500',
      label: 'Connecting...',
      animate: true,
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-muted-foreground',
      dotColor: 'bg-muted-foreground',
      label: 'Reconnecting...',
      animate: false,
    },
    error: {
      icon: WifiOff,
      color: 'text-red-500',
      dotColor: 'bg-red-500',
      label: 'Connection failed',
      animate: false,
    },
  }[status]

  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/50',
              className,
            )}
          >
            <div
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                config.dotColor,
                status === 'connected' && 'animate-pulse',
              )}
            />
            <Icon
              className={cn(
                'h-3 w-3',
                config.color,
                config.animate && 'animate-spin',
              )}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
