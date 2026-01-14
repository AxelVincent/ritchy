import type { PlaceTabValue } from '@/components/map-display/store/useMapStore'
import type { SearchResult } from '@api/shared'
import type { ColumnDef } from '@tanstack/react-table'
import { ClickableCell } from './ClickableCell'
import { CopyCell } from './ColumnCells'
import { HeaderWrapper } from './HeaderWrapper'

interface TextColumnConfig {
  id: string
  accessorKey: string
  title: string
  size?: number
  filterVariant?: 'text' | 'multi-select' | 'select'
  enableSorting?: boolean
  isEnrichment?: boolean
  defaultVisible?: boolean
  href?: (row: SearchResult) => string | undefined
  openTab?: PlaceTabValue // New: which tab to open on click
}

export const createTextColumn = ({
  id,
  accessorKey,
  title,
  size = 200,
  filterVariant = 'text',
  enableSorting = true,
  isEnrichment = false,
  defaultVisible,
  href,
  openTab = 'details', // Default to details tab
}: TextColumnConfig): ColumnDef<SearchResult> => ({
  id,
  accessorKey,
  size,
  enableSorting,
  meta: {
    filterVariant,
    isEnrichment,
    defaultVisible,
  },
  header: ({ column }) => <HeaderWrapper column={column} title={title} />,
  cell: ({ getValue, row }) => {
    const content = getValue() as string | null
    const linkHref = href ? href(row.original) : undefined

    return (
      <ClickableCell placeId={row.original.id} tab={openTab} className="p-0">
        {content && <CopyCell content={content} href={linkHref} />}
      </ClickableCell>
    )
  },
})
