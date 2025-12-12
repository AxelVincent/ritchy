import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PaginationMeta } from '@ritchy/types'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react'

interface PaginationProps {
  pagination: PaginationMeta
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  isLoading?: boolean
  isMobile?: boolean
}

const PAGE_SIZE_OPTIONS = [25, 50, 100]

export const Pagination = ({
  pagination,
  onPageChange,
  onPageSizeChange,
  isLoading,
  isMobile = false,
}: PaginationProps) => {
  const {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  } = pagination

  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)

  // Mobile: Simplified pagination with larger touch targets
  if (isMobile) {
    return (
      <div className="flex flex-col gap-2 px-3 py-3 border-t border-border/60 bg-background/50">
        {/* Results count row */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>
              {startItem}-{endItem} of {totalItems}
            </span>
          </div>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange?.(Number(value))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[70px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Navigation row - larger touch targets (min 44x44px) */}
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-2"
        >
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={() => onPageChange?.(page - 1)}
            disabled={!hasPreviousPage || isLoading}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Button>

          <span
            className="px-4 text-sm font-medium min-w-[100px] text-center"
            aria-live="polite"
          >
            {page} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={() => onPageChange?.(page + 1)}
            disabled={!hasNextPage || isLoading}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </nav>
      </div>
    )
  }

  // Desktop: Full pagination controls
  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-border/60 bg-background/50">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        <span>
          Showing {startItem} - {endItem} of {totalItems}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange?.(Number(value))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange?.(1)}
            disabled={!hasPreviousPage || isLoading}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange?.(page - 1)}
            disabled={!hasPreviousPage || isLoading}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>

          <span className="px-3 text-sm" aria-live="polite">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange?.(page + 1)}
            disabled={!hasNextPage || isLoading}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange?.(totalPages)}
            disabled={!hasNextPage || isLoading}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>
      </div>
    </div>
  )
}
