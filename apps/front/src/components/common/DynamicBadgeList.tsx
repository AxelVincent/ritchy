import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DynamicBadgeListProps {
  items: string[]
  badgeVariant?: 'default' | 'secondary' | 'outline'
  containerClassName?: string
  badgeClassName?: string
  containerPadding?: number
  characterWidth?: number
}

export const DynamicBadgeList = ({
  items,
  badgeVariant = 'secondary',
  containerClassName = '',
  badgeClassName = '',
}: DynamicBadgeListProps) => {
  const remainingCount = items.length - 1

  return (
    <div className={`flex gap-1.5 items-center ${containerClassName}`}>
      {items.length > 0 && (
        <Badge
          variant={badgeVariant}
          key={items[0]}
          className={`shrink-0 ${badgeClassName}`}
        >
          {items[0]}
        </Badge>
      )}
      {remainingCount > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <div
              className="cursor-pointer flex items-center"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
            >
              <Badge variant="secondary">+{remainingCount}</Badge>
            </div>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex flex-row gap-2 flex-wrap">
              {items.slice(1).map((item) => (
                <Badge variant={badgeVariant} key={item}>
                  {item}
                </Badge>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
