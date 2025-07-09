import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { ColumnPinCell } from './utils/ColumnCells'
import { HeaderWrapper } from './utils/HeaderWrapper'

const noPriceRange = 'No price range'
const formatPriceRange = (range: SearchResult['priceRange']) => {
  if (!range) return noPriceRange

  const start = range.startPrice?.units
  const end = range.endPrice?.units
  const currency =
    range.startPrice?.currencyCode || range.endPrice?.currencyCode || ''

  if (!start && !end) return noPriceRange
  if (!start) return `Up to ${end} ${currency}`
  if (!end) return `${start}+ ${currency}`
  return `${start} - ${end} ${currency}`
}

export const priceRangeColumn: ColumnDef<SearchResult> = {
  id: 'priceRange',
  size: 200,
  accessorFn: (row) => formatPriceRange(row.priceRange),
  meta: {
    filterVariant: 'multi-select',
  },
  header: () => <HeaderWrapper title="Price Range" />,
  cell: ({ row }) => {
    const formattedPrice = formatPriceRange(row.original.priceRange)
    return (
      <ColumnPinCell
        id={row.original.id}
        content={formattedPrice === noPriceRange ? null : formattedPrice}
      />
    )
  },
}
