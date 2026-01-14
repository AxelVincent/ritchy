import { useApiActivity } from '@/api/queries/api-keys/useApiActivity'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { JsonTreeViewer } from '@/components/ui/json-tree-viewer'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ApiActivityLogItem } from '@api/routes_web/api_keys/activity/contract'
import { format, formatDistanceToNow } from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, Zap } from 'lucide-react'
import { useState } from 'react'

const PAGE_SIZE = 10

const getStatusBadgeVariant = (statusCode: number) => {
  if (statusCode >= 200 && statusCode < 300) {
    return 'emerald' as const
  }
  if (statusCode >= 400 && statusCode < 500) {
    return 'amber' as const
  }
  return 'rose' as const
}

const JsonBlock = ({
  data,
  className,
}: { data: unknown; className?: string }) => {
  return (
    <div
      className={`bg-muted/50 rounded-md p-3 overflow-x-auto overflow-y-auto ${className ?? ''}`}
    >
      <JsonTreeViewer
        data={data}
        showRoot={false}
        defaultExpanded={true}
        className="text-xs"
      />
    </div>
  )
}

const ActivityItem = ({
  item,
  onClick,
}: {
  item: ApiActivityLogItem
  onClick: () => void
}) => {
  const timeAgo = formatDistanceToNow(new Date(item.createdAt), {
    addSuffix: true,
  })

  return (
    <button
      type="button"
      className="w-full flex items-center justify-between py-3 px-3 text-left transition-colors hover:bg-muted/30 cursor-pointer border-b last:border-b-0"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Badge
          variant={getStatusBadgeVariant(item.statusCode)}
          className="shrink-0"
        >
          {item.statusCode}
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {item.method}
            </span>
            <span className="text-sm font-mono text-foreground truncate">
              {item.endpoint}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="truncate max-w-[120px]">{item.apiKeyName}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
        {item.latencyMs !== null && (
          <span className="flex items-center gap-1 tabular-nums">
            <Zap className="h-3 w-3" />
            {item.latencyMs}ms
          </span>
        )}
        {item.creditsUsed > 0 && (
          <span className="text-amber-600 font-medium tabular-nums">
            -{item.creditsUsed}
          </span>
        )}
      </div>
    </button>
  )
}

const ActivityDetailDrawer = ({
  item,
  open,
  onOpenChange,
}: {
  item: ApiActivityLogItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  if (!item) return null

  const hasRequest = item.requestBody !== null
  const hasResponse = item.responseBody !== null
  const defaultTab = hasResponse ? 'response' : 'request'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(item.statusCode)}>
              {item.statusCode}
            </Badge>
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              {item.method}
            </span>
            <span className="font-mono text-sm truncate">{item.endpoint}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-4 text-sm py-4 border-b shrink-0">
          <div>
            <span className="text-muted-foreground text-xs">API Key</span>
            <p className="font-medium truncate">{item.apiKeyName}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Timestamp</span>
            <p className="font-medium">
              {format(new Date(item.createdAt), 'MMM d, yyyy HH:mm:ss')}
            </p>
          </div>
          {item.latencyMs !== null && (
            <div>
              <span className="text-muted-foreground text-xs">Latency</span>
              <p className="font-medium">{item.latencyMs}ms</p>
            </div>
          )}
          {item.creditsUsed > 0 && (
            <div>
              <span className="text-muted-foreground text-xs">
                Credits Used
              </span>
              <p className="font-medium">{item.creditsUsed}</p>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0">
          {(hasRequest || hasResponse) && (
            <Tabs defaultValue={defaultTab} className="h-full flex flex-col">
              <TabsList className="shrink-0">
                {hasRequest && (
                  <TabsTrigger value="request">Request</TabsTrigger>
                )}
                {hasResponse && (
                  <TabsTrigger value="response">Response</TabsTrigger>
                )}
              </TabsList>
              {hasRequest && (
                <TabsContent
                  value="request"
                  className="flex-1 min-h-0 mt-0 pt-4 data-[state=active]:flex data-[state=active]:flex-col"
                >
                  <JsonBlock
                    data={item.requestBody}
                    className="flex-1 max-h-none"
                  />
                </TabsContent>
              )}
              {hasResponse && (
                <TabsContent
                  value="response"
                  className="flex-1 min-h-0 mt-0 pt-4 data-[state=active]:flex data-[state=active]:flex-col"
                >
                  <JsonBlock
                    data={item.responseBody}
                    className="flex-1 max-h-none"
                  />
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

const ActivitySkeleton = () => (
  <div className="py-3 border-b last:border-b-0">
    <div className="flex items-center gap-3 px-3">
      <Skeleton className="h-6 w-14 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  </div>
)

export const ActivityLog = () => {
  const [page, setPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<ApiActivityLogItem | null>(
    null,
  )
  const { data, isLoading } = useApiActivity({ page, pageSize: PAGE_SIZE })

  const items = data?.items ?? []
  const pagination = data?.pagination

  if (isLoading && items.length === 0) {
    return (
      <div className="border rounded-lg bg-card">
        <div className="border-b px-4 py-3">
          <span className="font-medium">Activity Log</span>
        </div>
        <div>
          <ActivitySkeleton />
          <ActivitySkeleton />
          <ActivitySkeleton />
          <ActivitySkeleton />
          <ActivitySkeleton />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="border rounded-lg bg-card">
        <div className="border-b px-4 py-3">
          <span className="font-medium">Activity Log</span>
        </div>
        <div className="px-4 py-8 text-center text-muted-foreground">
          <p>No API requests yet.</p>
          <p className="text-sm mt-1">
            Make your first request to see activity here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-lg bg-card">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <span className="font-medium">Activity Log</span>
          {pagination && (
            <span className="text-xs text-muted-foreground">
              {pagination.totalItems} request
              {pagination.totalItems !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div>
          {items.map((item) => (
            <ActivityItem
              key={item.id}
              item={item}
              onClick={() => setSelectedItem(item)}
            />
          ))}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="border-t px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage((p) => p - 1)}
                disabled={!pagination.hasPreviousPage || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNextPage || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ActivityDetailDrawer
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      />
    </>
  )
}
