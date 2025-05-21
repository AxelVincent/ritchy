import { TextWrapper } from '@/components/common/TextWrapper'
import { useMapStore } from '@/components/map-display/store/useMapStore'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { EnrichmentWithStatus, SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Info, Loader2 } from 'lucide-react'
import { HeaderWrapper } from './utils/HeaderWrapper'
import { DataExport } from '@/components/data-export/DataExport'
import { CompanyMetadataContent } from '@/components/common/CompanyMetadataContent'

export const companyMetadataColumn: ColumnDef<SearchResult> = {
  id: 'companyMetadata',
  accessorKey: 'enrichment',
  size: 200,
  enableColumnFilter: false,
  enableSorting: false,
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Company Metadata" />
  ),
  cell: ({ row, table }) => {
    const { setSelectedPlaceId } = useMapStore()
    const enrichment = row.original.enrichment as
      | EnrichmentWithStatus
      | undefined
    const website = row.original.website

    if (!website) {
      return (
        <TextWrapper
          id={row.original.id}
          actions={[
            {
              icon: 'MapPinned',
              onClick: () => {
                table.options.meta?.setSelectedPlaceId?.(row.original.id)
              },
              label: 'Pin to map',
            },
          ]}
          className="text-muted-foreground"
          disableContentTooltip
        >
          <Button
            variant="outline"
            size="sm"
            disabled
            className="w-full pointer-events-none"
          >
            Unavailable
          </Button>
        </TextWrapper>
      )
    }

    if (enrichment?.isLoading) {
      return (
        <TextWrapper
          id={row.original.id}
          actions={[
            {
              icon: 'MapPinned',
              onClick: () => {
                setSelectedPlaceId(row.original.id)
              },
              label: 'Pin to map',
            },
          ]}
          disableContentTooltip
        >
          <Button variant="outline" size="sm" disabled className="w-full">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enriching...
          </Button>
        </TextWrapper>
      )
    }

    if (!enrichment || enrichment.error) {
      return (
        <TextWrapper
          id={row.original.id}
          actions={[
            {
              icon: 'MapPinned',
              onClick: () => {
                setSelectedPlaceId(row.original.id)
              },
              label: 'Pin to map',
            },
          ]}
          className="text-muted-foreground"
          disableContentTooltip
        >
          <Button variant="outline" size="sm" disabled className="w-full">
            {enrichment?.error ? 'Error' : 'No data'}
          </Button>
        </TextWrapper>
      )
    }

    const hasContent = Boolean(
      (enrichment.social_networks &&
        Object.values(enrichment.social_networks).some(Boolean)) ||
        enrichment.contact_info?.email ||
        enrichment.contact_info?.phone ||
        enrichment.contact_info?.address ||
        enrichment.business_info?.name ||
        enrichment.business_info?.sector,
    )

    return (
      <TextWrapper
        id={row.original.id}
        actions={[
          {
            icon: 'MapPinned',
            onClick: () => {
              setSelectedPlaceId(row.original.id)
            },
            label: 'Pin to map',
          },
        ]}
        disableContentTooltip
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasContent}
              className={cn(
                'w-full',
                hasContent && 'text-green-600 hover:text-green-700',
              )}
            >
              {hasContent ? 'View Data' : 'No data'}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center justify-between w-full pr-6">
                  <span>{row.original.name}</span>
                  <DataExport selectedRows={[row.original]} />
                </div>
              </DialogTitle>
            </DialogHeader>

            <CompanyMetadataContent enrichment={enrichment} />

            <DialogFooter className="border-t pt-4 flex justify-between items-center">
              {enrichment.last_updated && (
                <span className="text-sm text-muted-foreground flex-1">
                  Updated{' '}
                  {format(new Date(enrichment.last_updated), 'MMM d, yyyy')}
                </span>
              )}
              <div className="text-sm text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1">
                      <Info className="h-4 w-4" />
                      Data automatically extracted from website
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        This data has been automatically extracted from the
                        business website. While we strive for accuracy, some
                        details may be outdated or incorrect. Please verify
                        critical information before use.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TextWrapper>
    )
  },
}
