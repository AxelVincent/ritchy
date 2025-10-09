import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { WebSocketStatus } from '@/hooks/useEnrichmentWebSocket'
import { Wifi, WifiOff } from 'lucide-react'

interface WebSocketStatusIndicatorProps {
  status: WebSocketStatus
  className?: string
}

/**
 * Visual indicator showing WebSocket connection status
 * Displays different colors and icons based on connection state
 */
export const WebSocketStatusIndicator = ({
  status,
  className,
}: WebSocketStatusIndicatorProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="h-3 w-3" />,
          label: 'Live',
          tooltip: 'Real-time updates active',
          variant: 'default' as const,
          className: 'bg-green-500 hover:bg-green-600',
        }
      case 'connecting':
        return {
          icon: <Wifi className="h-3 w-3 animate-pulse" />,
          label: 'Connecting',
          tooltip: 'Establishing connection...',
          variant: 'secondary' as const,
          className: 'bg-yellow-500 hover:bg-yellow-600',
        }
      case 'disconnected':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          label: 'Offline',
          tooltip: 'Using polling fallback',
          variant: 'outline' as const,
          className: 'border-gray-400 text-gray-500',
        }
      case 'error':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          label: 'Error',
          tooltip: 'Connection failed - using polling fallback',
          variant: 'destructive' as const,
          className: 'bg-red-500 hover:bg-red-600',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={`flex items-center gap-1 text-xs px-2 py-0.5 ${config.className} ${className || ''}`}
          >
            {config.icon}
            <span>{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
