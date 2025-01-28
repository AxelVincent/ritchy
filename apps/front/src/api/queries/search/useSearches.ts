import { type UseQueryResult, useQuery } from '@tanstack/react-query'

const recentSearches = [
  {
    id: '3b5bbb6d-4e27-448e-9db8-061160e462c8',
    location_formatted: 'Paris',
    keyword: 'Coffee shops',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '416a1967-881c-45e0-94f0-36458f2226c9',
    location_formatted: 'London',
    keyword: 'Art galleries',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
  {
    id: 'b234d051-48a8-4433-8a8d-ca06a8e4a795',
    location_formatted: 'Barcelona',
    keyword: 'Tapas bars',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '40bd5a86-81dc-463e-a126-09ca5aa19f8f',
    location_formatted: 'Amsterdam',
    keyword: 'Bike rentals',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'f5b8931e-d53b-453e-971a-e55204f2cb28',
    location_formatted: 'Berlin',
    keyword: 'Tech startups',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: '115f0229-5f77-4a38-b25b-4b25ff17b54e',
    location_formatted: 'Rome',
    keyword: 'Gelato shops',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  },
  {
    id: '55742a40-05d1-4d0d-90d6-7d0373a9df49',
    location_formatted: 'Vienna',
    keyword: 'Classical music venues',
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
    updated_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'e99c630e-3f39-4942-9bb9-e5eff4c2730f',
    location_formatted: 'Prague',
    keyword: 'Beer gardens',
    created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
    updated_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'e9732c44-1df3-45bd-b63e-f8d623e1bd2a',
    location_formatted: 'Stockholm',
    keyword: 'Design stores',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
    updated_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'b3598c5c-a42a-4e21-ad25-94d4f788be35',
    location_formatted: 'Copenhagen',
    keyword: 'Modern restaurants',
    created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
    updated_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
  },
  {
    id: '7d9a4e1b-c8f2-4b9a-9e3d-1f2c3d4e5f6a',
    location_formatted: 'New York',
    keyword: 'Jazz clubs',
    created_at: new Date('2023-12-15T12:00:00Z'),
    updated_at: new Date('2023-12-15T12:00:00Z'),
  },
  {
    id: '9e8d7c6b-5a4f-3e2d-1c0b-9a8b7c6d5e4f',
    location_formatted: 'Tokyo',
    keyword: 'Ramen shops',
    created_at: new Date('2023-06-20T15:30:00Z'),
    updated_at: new Date('2023-06-20T15:30:00Z'),
  },
  {
    id: '2b3c4d5e-6f7g-8h9i-j0k1-l2m3n4o5p6q',
    location_formatted: 'San Francisco',
    keyword: 'Tech meetups',
    created_at: new Date('2022-11-05T09:45:00Z'),
    updated_at: new Date('2022-11-05T09:45:00Z'),
  },
]

export const useSearchesQuery = (): UseQueryResult<typeof recentSearches> => {
  return useQuery({
    queryKey: ['searches'],
    queryFn: async () => recentSearches,
  })
}
