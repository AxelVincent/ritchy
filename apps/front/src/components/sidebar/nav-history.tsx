import { useSearchesQuery } from '@/api/queries/search/useSearches'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import type { Search } from '@api/shared'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  History,
  Loader2,
  Minus,
  MoreHorizontal,
  RotateCcw,
} from 'lucide-react'
import React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

type SearchGroup = {
  label: string
  items: Search
}

function groupSearchesByDate(searches: Search): SearchGroup[] {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Group older searches by year
  const olderSearches = searches.filter(
    (s) => new Date(s.createdAt) < thirtyDaysAgo,
  )
  const yearGroups = olderSearches.reduce(
    (acc: Record<number, Search>, search) => {
      const year = new Date(search.createdAt).getFullYear()
      acc[year] = acc[year] || []
      acc[year].push(search)
      return acc
    },
    {},
  )

  return [
    {
      label: 'Today',
      items: searches.filter((s) => new Date(s.createdAt) >= oneDayAgo),
    },
    {
      label: 'Previous 7 Days',
      items: searches.filter((s) => {
        const date = new Date(s.createdAt)
        return date < oneDayAgo && date >= sevenDaysAgo
      }),
    },
    {
      label: 'Previous 30 Days',
      items: searches.filter((s) => {
        const date = new Date(s.createdAt)
        return date < sevenDaysAgo && date >= thirtyDaysAgo
      }),
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
  const navigate = useNavigate()
  const routerState = useRouterState()

  // Check if a search is active by looking at URL search params
  const isSearchActive = (searchId: string): boolean => {
    const search = routerState.location.search as Record<string, string>
    return search.searchId === searchId
  }

  const {
    data: { searches = [] } = { searches: [] },
    isLoading,
  } = useSearchesQuery()
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
                      tooltip={`${search.keyword} - ${search.locationFormatted}`}
                      className={cn('justify-between')}
                      isActive={isSearchActive(search.id)}
                    >
                      <Link
                        to="/search/$searchId"
                        params={{ searchId: search.id }}
                      >
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
                                title={search.locationFormatted}
                              >
                                {search.locationFormatted}
                              </p>
                            </div>
                          </>
                        ) : (
                          <History className="h-4 w-4" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction showOnHover>
                          <MoreHorizontal />
                          <p className="sr-only">More</p>
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-48 rounded-lg"
                        side={open ? 'bottom' : 'right'}
                        align={open ? 'end' : 'start'}
                      >
                        <DropdownMenuItem
                          onClick={() => {
                            navigate({
                              to: '/search',
                              search: {
                                mode: 'keyword',
                                model: search.model as 'BASIC' | 'ENHANCED',
                                northEastLat:
                                  search.rectangle.northEast.latitude,
                                northEastLng:
                                  search.rectangle.northEast.longitude,
                                southWestLat:
                                  search.rectangle.southWest.latitude,
                                southWestLng:
                                  search.rectangle.southWest.longitude,
                                placeName: search.locationFormatted,
                                keyword: search.keyword,
                                navTimestamp: Date.now(),
                              },
                            })
                          }}
                        >
                          <RotateCcw className="text-muted-foreground" />
                          Repeat search
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
