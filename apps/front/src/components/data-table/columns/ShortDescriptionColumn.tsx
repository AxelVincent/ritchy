import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { SearchResult } from '@api/shared'
import type { ColumnDef } from '@tanstack/react-table'
import React from 'react'
import { ClickableCell } from './utils/ClickableCell'
import { CopyButton } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

const ShortDescriptionCell = React.memo(function ShortDescriptionCell({
  content,
}: {
  content: string
}) {
  return (
    <div className="group/cell relative w-full h-full flex items-center">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block truncate px-2 py-1 cursor-pointer">
              {content}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-md">
            <p className="text-xs whitespace-pre-wrap">{content}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <CopyButton valueToCopy={content} ariaLabel="Copy" />
    </div>
  )
})

export const shortDescriptionColumn: ColumnDef<SearchResult> = {
  id: 'shortDescription',
  accessorKey: 'shortDescription',
  size: 200,
  enableSorting: true,
  meta: {
    filterVariant: 'text',
    isEnrichment: true,
  },
  header: ({ column }) => (
    <HeaderWrapper column={column} title="Short Description" />
  ),
  cell: ({ getValue, row }) => {
    const content = getValue() as string | null

    return (
      <ClickableCell placeId={row.original.id} tab="details" className="p-0">
        {content && <ShortDescriptionCell content={content} />}
      </ClickableCell>
    )
  },
}
