import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { History, Minus, MoreHorizontal } from 'lucide-react'
import React from 'react'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '../ui/sidebar'

const recentSearches = [
  {
    id: '3b5bbb6d-4e27-448e-9db8-061160e462c8',
    location_formatted: 'Paris',
    location: {
      radius: 1000,
      latitude: 48.8566,
      longitude: 2.3522,
    },
    keyword: 'Coffee shops',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '416a1967-881c-45e0-94f0-36458f2226c9',
    location_formatted: 'London',
    location: {
      radius: 1500,
      latitude: 51.5074,
      longitude: -0.1278,
    },
    keyword: 'Art galleries',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
  {
    id: 'b234d051-48a8-4433-8a8d-ca06a8e4a795',
    location_formatted: 'Barcelona',
    location: {
      radius: 2000,
      latitude: 41.3851,
      longitude: 2.1734,
    },
    keyword: 'Tapas bars',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '40bd5a86-81dc-463e-a126-09ca5aa19f8f',
    location_formatted: 'Amsterdam',
    location: {
      radius: 1200,
      latitude: 52.3676,
      longitude: 4.9041,
    },
    keyword: 'Bike rentals',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'f5b8931e-d53b-453e-971a-e55204f2cb28',
    location_formatted: 'Berlin',
    location: {
      radius: 2500,
      latitude: 52.52,
      longitude: 13.405,
    },
    keyword: 'Tech startups',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: '115f0229-5f77-4a38-b25b-4b25ff17b54e',
    location_formatted: 'Rome',
    location: {
      radius: 800,
      latitude: 41.9028,
      longitude: 12.4964,
    },
    keyword: 'Gelato shops',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  },
  {
    id: '55742a40-05d1-4d0d-90d6-7d0373a9df49',
    location_formatted: 'Vienna',
    location: {
      radius: 1800,
      latitude: 48.2082,
      longitude: 16.3738,
    },
    keyword: 'Classical music venues',
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
    updated_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'e99c630e-3f39-4942-9bb9-e5eff4c2730f',
    location_formatted: 'Prague',
    location: {
      radius: 1600,
      latitude: 50.0755,
      longitude: 14.4378,
    },
    keyword: 'Beer gardens',
    created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
    updated_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'e9732c44-1df3-45bd-b63e-f8d623e1bd2a',
    location_formatted: 'Stockholm',
    location: {
      radius: 2200,
      latitude: 59.3293,
      longitude: 18.0686,
    },
    keyword: 'Design stores',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
    updated_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'b3598c5c-a42a-4e21-ad25-94d4f788be35',
    location_formatted: 'Copenhagen',
    location: {
      radius: 1700,
      latitude: 55.6761,
      longitude: 12.5683,
    },
    keyword: 'Modern restaurants',
    created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
    updated_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
  },
  {
    id: '7d9a4e1b-c8f2-4b9a-9e3d-1f2c3d4e5f6a',
    location_formatted: 'New York',
    location: {
      radius: 2000,
      latitude: 40.7128,
      longitude: -74.006,
    },
    keyword: 'Jazz clubs',
    created_at: new Date('2023-12-15T12:00:00Z'),
    updated_at: new Date('2023-12-15T12:00:00Z'),
  },
  {
    id: '9e8d7c6b-5a4f-3e2d-1c0b-9a8b7c6d5e4f',
    location_formatted: 'Tokyo',
    location: {
      radius: 1500,
      latitude: 35.6762,
      longitude: 139.6503,
    },
    keyword: 'Ramen shops',
    created_at: new Date('2023-06-20T15:30:00Z'),
    updated_at: new Date('2023-06-20T15:30:00Z'),
  },
  {
    id: '2b3c4d5e-6f7g-8h9i-j0k1-l2m3n4o5p6q',
    location_formatted: 'San Francisco',
    location: {
      radius: 1800,
      latitude: 37.7749,
      longitude: -122.4194,
    },
    keyword: 'Tech meetups',
    created_at: new Date('2022-11-05T09:45:00Z'),
    updated_at: new Date('2022-11-05T09:45:00Z'),
  },
]

type SearchGroup = {
  label: string
  items: typeof recentSearches
}

function groupSearchesByDate(searches: typeof recentSearches): SearchGroup[] {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Group older searches by year
  const olderSearches = searches.filter((s) => s.created_at < thirtyDaysAgo)
  const yearGroups = olderSearches.reduce(
    (acc: Record<number, typeof recentSearches>, search) => {
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
  const groups = groupSearchesByDate(recentSearches)
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

      {recentSearches.length > 5 && (
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
    </SidebarGroup>
  )
}
