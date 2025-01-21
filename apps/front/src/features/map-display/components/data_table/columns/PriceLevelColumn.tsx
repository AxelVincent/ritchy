import { TextWrapper } from '@/components/common/TextWrapper'
import { toast } from '@/hooks/use-toast'
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
  size: 150,
  meta: {
    filterVariant: 'multi-select',
  },
  header: ({ column }) => <HeaderWrapper column={column} title="Price Level" />,
  cell: ({ row, table }) => {
    const formattedLevel = formatPriceLevel(row.original.priceLevel)
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
          {
            icon: 'Copy',
            onClick: () => {
              navigator.clipboard.writeText(formattedLevel)
              toast({
                title: formattedLevel,
                description: 'Copied to clipboard',
              })
            },
            label: 'Copy',
          },
        ]}
      >
        {formattedLevel === noPriceLevel ? null : formattedLevel}
      </TextWrapper>
    )
  },
}
