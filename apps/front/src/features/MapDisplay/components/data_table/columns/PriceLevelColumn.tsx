import { TextWrapper } from '@/components/common/TextWrapper'
import type { SearchResult } from '@ritchy/types'
import type { ColumnDef } from '@tanstack/react-table'
import { HeaderWrapper } from './utils/HeaderWrapper'

const noPriceLevel = 'No price level'
const formatPriceLevel = (level: SearchResult['priceLevel']) => {
  if (!level) return noPriceLevel

  const priceMap: Record<string, string> = {
    PRICE_LEVEL_FREE: 'Free',
    PRICE_LEVEL_INEXPENSIVE: '$',
    PRICE_LEVEL_MODERATE: '$$',
    PRICE_LEVEL_EXPENSIVE: '$$$',
    PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
  }

  return priceMap[level] || noPriceLevel
}

export const priceLevelColumn: ColumnDef<SearchResult> = {
  id: 'priceLevel',
  accessorFn: (row) => formatPriceLevel(row.priceLevel),
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Price Level" />,
  cell: ({ row }) => {
    const formattedLevel = formatPriceLevel(row.original.priceLevel)
    return (
      <TextWrapper>
        {formattedLevel === noPriceLevel ? null : formattedLevel}
      </TextWrapper>
    )
  },
}
