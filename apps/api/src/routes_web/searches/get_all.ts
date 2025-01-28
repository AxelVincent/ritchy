import { logger } from '@ritchy/logger'
import type { GetSearchesApiResponse } from '@ritchy/types'
import type { Request, Response } from 'express'

export const getSearches = async (
  _req: Request,
  res: Response<GetSearchesApiResponse>,
): Promise<void> => {
  try {
    res.json({
      searches: [
        {
          id: '3b5bbb6d-4e27-448e-9db8-061160e462c8',
          locationFormatted: 'Paris',
          keyword: 'Coffee shops',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
        {
          id: '416a1967-881c-45e0-94f0-36458f2226c9',
          locationFormatted: 'London',
          keyword: 'Art galleries',
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        },
        {
          id: 'b234d051-48a8-4433-8a8d-ca06a8e4a795',
          locationFormatted: 'Barcelona',
          keyword: 'Tapas bars',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
          id: '40bd5a86-81dc-463e-a126-09ca5aa19f8f',
          locationFormatted: 'Amsterdam',
          keyword: 'Bike rentals',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'f5b8931e-d53b-453e-971a-e55204f2cb28',
          locationFormatted: 'Berlin',
          keyword: 'Tech startups',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          id: '115f0229-5f77-4a38-b25b-4b25ff17b54e',
          locationFormatted: 'Rome',
          keyword: 'Gelato shops',
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
          updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        },
        {
          id: '55742a40-05d1-4d0d-90d6-7d0373a9df49',
          locationFormatted: 'Vienna',
          keyword: 'Classical music venues',
          createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
          updatedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'e99c630e-3f39-4942-9bb9-e5eff4c2730f',
          locationFormatted: 'Prague',
          keyword: 'Beer gardens',
          createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
          updatedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'e9732c44-1df3-45bd-b63e-f8d623e1bd2a',
          locationFormatted: 'Stockholm',
          keyword: 'Design stores',
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
          updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'b3598c5c-a42a-4e21-ad25-94d4f788be35',
          locationFormatted: 'Copenhagen',
          keyword: 'Modern restaurants',
          createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
          updatedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
        },
        {
          id: '7d9a4e1b-c8f2-4b9a-9e3d-1f2c3d4e5f6a',
          locationFormatted: 'New York',
          keyword: 'Jazz clubs',
          createdAt: new Date('2023-12-15T12:00:00Z'),
          updatedAt: new Date('2023-12-15T12:00:00Z'),
        },
        {
          id: '9e8d7c6b-5a4f-3e2d-1c0b-9a8b7c6d5e4f',
          locationFormatted: 'Tokyo',
          keyword: 'Ramen shops',
          createdAt: new Date('2023-06-20T15:30:00Z'),
          updatedAt: new Date('2023-06-20T15:30:00Z'),
        },
        {
          id: '2b3c4d5e-6f7g-8h9i-j0k1-l2m3n4o5p6q',
          locationFormatted: 'San Francisco',
          keyword: 'Tech meetups',
          createdAt: new Date('2022-11-05T09:45:00Z'),
          updatedAt: new Date('2022-11-05T09:45:00Z'),
        },
      ],
    })
  } catch (error) {
    logger.error({
      msg: 'Get searches error',
      event: 'get_searches_error',
      metadata: { error },
    })
  }
}
