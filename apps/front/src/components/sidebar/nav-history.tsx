import { useSearchesQuery } from '@/api/queries/search/useSearches'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import type { SearchHistory } from '@ritchy/types'
import { Link } from '@tanstack/react-router'
import { History, Loader2, Minus, MoreHorizontal } from 'lucide-react'
import React from 'react'

type SearchGroup = {
  label: string
  items: SearchHistory
}

function groupSearchesByDate(searches: SearchHistory): SearchGroup[] {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Group older searches by year
  const olderSearches = searches.filter((s) => s.created_at < thirtyDaysAgo)
  const yearGroups = olderSearches.reduce(
    (acc: Record<number, SearchHistory>, search) => {
      const year = search.created_at.getFullYear()
      acc[year] = acc[year] || []
      acc[year].push(search)
      return acc
    },
    {},
  )

  return [
    {
      label: 'Today',
      items: searches.filter((s) => s.created_at >= oneDayAgo),
    },
    {
      label: 'Previous 7 Days',
      items: searches.filter(
        (s) => s.created_at < oneDayAgo && s.created_at >= sevenDaysAgo,
      ),
    },
    {
      label: 'Previous 30 Days',
      items: searches.filter(
        (s) => s.created_at < sevenDaysAgo && s.created_at >= thirtyDaysAgo,
      ),
    },
    ...Object.entries(yearGroups)
      .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
      .map(([year, items]) => ({
        label: year,
        items,
      })),
  ].filter((group) => group.items.length > 0)
}

export function NavHistory() {
  const { open } = useSidebar()
  const { data: searches = [], isLoading } = useSearchesQuery()
  const groups = groupSearchesByDate(searches)
  const [showAll, setShowAll] = React.useState(false)

  const visibleGroups = React.useMemo(() => {
    if (showAll) return groups

    // Show only first 5 items total across all groups
    let count = 0
    return groups.reduce((acc: SearchGroup[], group) => {
      if (count >= 5) return acc

      const remainingSlots = 5 - count
      const items = group.items.slice(0, remainingSlots)
      count += items.length

      if (items.length > 0) {
        acc.push({ ...group, items })
      }

      return acc
    }, [])
  }, [groups, showAll])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <span>Recent searches</span>
      </SidebarGroupLabel>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <>
          {visibleGroups.map((group) => (
            <div key={group.label}>
              {open ? (
                <p className="mb-2 mt-4 px-2 text-xs font-medium text-muted-foreground">
                  {group.label}
                </p>
              ) : null}
              <SidebarMenu>
                {group.items.map((search) => (
                  <SidebarMenuItem key={search.id}>
                    <SidebarMenuButton
                      asChild
                      tooltip={`${search.keyword} - ${search.location_formatted}`}
                      className={cn('justify-between')}
                    >
                      <Link to={`/search/${search.id}`}>
                        {open ? (
                          <>
                            <div className="w-full flex flex-row items-center gap-2">
                              <p
                                className="flex-1 font-medium truncate"
                                title={search.keyword}
                              >
                                {search.keyword}
                              </p>
                              <p
                                className="flex-shrink-0 w-20 text-xs text-muted-foreground truncate text-left"
                                title={search.location_formatted}
                              >
                                {search.location_formatted}
                              </p>
                            </div>
                          </>
                        ) : (
                          <History className="h-4 w-4" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          ))}
          {searches.length > 5 && (
            <SidebarMenuItem key="show-more" className="list-none">
              <SidebarMenuButton
                onClick={() => setShowAll(!showAll)}
                className={cn('justify-between')}
                tooltip={
                  showAll
                    ? 'Show less recent searches'
                    : 'Show more recent searches'
                }
              >
                {open ? (
                  <div className="flex items-center justify-left text-sm text-muted-foreground">
                    {showAll ? (
                      <div className="flex items-center gap-2">
                        <Minus className="h-4 w-4" />
                        Less
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <MoreHorizontal className="h-4 w-4" />
                        More
                      </div>
                    )}
                  </div>
                ) : showAll ? (
                  <Minus className="h-4 w-4" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </>
      )}
    </SidebarGroup>
  )
}
