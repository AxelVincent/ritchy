import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import type { PaginationMeta } from '@ritchy/types'
import {
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Map as MapIcon,
  Menu,
} from 'lucide-react'

type MobileLayoutState = 'table' | 'map'

interface MobileBottomBarProps {
  mobileLayout: MobileLayoutState
  onLayoutChange: (layout: MobileLayoutState) => void
  pagination?: PaginationMeta
  onPageChange?: (page: number) => void
}

export const MobileBottomBar = ({
  mobileLayout,
  onLayoutChange,
  pagination,
  onPageChange,
}: MobileBottomBarProps) => {
  const { toggleSidebar } = useSidebar()
  const showPagination = mobileLayout === 'table' && pagination

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.08)] safe-area-bottom">
      <div className="flex items-center h-14 px-2">
        {/* Left section: Menu button */}
        <div className="flex-1 flex items-center justify-start min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={toggleSidebar}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Center: Segmented toggle */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center bg-muted rounded-full p-1 gap-0.5">
            <button
              type="button"
              onClick={() => onLayoutChange('table')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                mobileLayout === 'table'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label="Show list view"
              aria-pressed={mobileLayout === 'table'}
            >
              <LayoutList className="h-4 w-4" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange('map')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                mobileLayout === 'map'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label="Show map view"
              aria-pressed={mobileLayout === 'map'}
            >
              <MapIcon className="h-4 w-4" />
              <span>Map</span>
            </button>
          </div>
        </div>

        {/* Right section: Pagination controls */}
        <div className="flex-1 flex items-center justify-end gap-0.5 min-w-0">
          {showPagination && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={!pagination.hasPreviousPage}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="text-sm font-medium tabular-nums min-w-[44px] text-center">
                {pagination.page}/{pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                aria-label="Next page"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
