import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useEffect, useRef, useState } from 'react'

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
  containerPadding = 60,
  characterWidth = 4.6,
}: DynamicBadgeListProps) => {
  const [visibleBadges, setVisibleBadges] = useState(2)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const calculateVisibleBadges = () => {
      const container = containerRef.current
      if (!container) return

      const containerWidth = container.offsetWidth
      const availableWidth = containerWidth - containerPadding

      let currentWidth = 0
      let visibleCount = 0

      for (const item of items) {
        const badgeWidth = item.length * characterWidth + 24 + 8

        if (currentWidth + badgeWidth <= availableWidth) {
          currentWidth += badgeWidth
          visibleCount++
        } else {
          break
        }
      }

      setVisibleBadges(Math.max(1, visibleCount))
    }

    calculateVisibleBadges()
    window.addEventListener('resize', calculateVisibleBadges)
    return () => window.removeEventListener('resize', calculateVisibleBadges)
  }, [items, characterWidth, containerPadding])

  const remainingCount = items.length - visibleBadges

  return (
    <div
      ref={containerRef}
      className={`flex gap-2 items-center ${containerClassName}`}
    >
      {items.slice(0, visibleBadges).map((item) => (
        <Badge
          variant={badgeVariant}
          key={item}
          className={`shrink-0 ${badgeClassName}`}
        >
          {item}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <div
              className="cursor-pointer"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
            >
              <Badge variant="outline">+{remainingCount}</Badge>
            </div>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex flex-row gap-2 flex-wrap">
              {items.slice(visibleBadges).map((item) => (
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
