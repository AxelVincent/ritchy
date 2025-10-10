import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
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
    if (!content) return null
    const linkHref = href ? href(row.original) : undefined
    return <CopyCell content={content} href={linkHref} />
  },
})
