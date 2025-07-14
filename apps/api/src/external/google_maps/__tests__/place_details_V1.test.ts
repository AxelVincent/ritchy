import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { CACHE_THRESHOLDS } from '../../../config/redis'
import { REDIS_KEYS } from '../../redis/keys'
import { redisClient } from '../../redis/redis'
import { getPlaceDetailsV1 } from '../place_details_V1'
import { placesApiQueue } from '../utils/places_api_queue'

// Mock environment variables for Redis
vi.mock('../../../config/redis', () => ({
  CACHE_THRESHOLDS: {
    PLACE_UPDATE_THRESHOLD: 3600, // 1 hour in seconds
  },
  REDIS_CONFIG: {
    REDISUSER: 'test-user',
    REDISPASSWORD: 'test-password',
    REDISHOST: 'localhost',
    REDISPORT: 6379,
  },
}))

// Mock dependencies
vi.mock('../../redis/redis')
vi.mock('../utils/places_api_queue')
vi.mock('@ritchy/logger')

// Mock fetch globally
const originalFetch = global.fetch
beforeAll(() => {
  global.fetch = vi.fn()
})

afterAll(() => {
  global.fetch = originalFetch
})

const mockPlaceData = {
  id: 'mock-place-id',
  displayName: {
    text: 'Mock Place',
    languageCode: 'en',
  },
  formattedAddress: '123 Mock St, Mock City',
  location: {
    latitude: 40.7128,
    longitude: -74.006,
  },
  rating: 4.5,
  userRatingCount: 100,
  googleMapsUri: 'https://maps.google.com/?mock',
  utcOffsetMinutes: -240,
  currentOpeningHours: {
    openNow: true,
    periods: [
      {
        open: { day: 0, hour: 9, minute: 0 },
        close: { day: 0, hour: 17, minute: 0 },
      },
    ],
    weekdayDescriptions: ['Monday: 9:00 AM - 5:00 PM'],
  },
}

describe('getPlaceDetailsV1', () => {
  const placeId = 'test-place-id'
  const redisKey = REDIS_KEYS.place(placeId)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should return cached data if fresh and not deleted', async () => {
    const cachedData = {
      data: mockPlaceData,
      is_deleted: false,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    vi.mocked(redisClient.get).mockResolvedValue(cachedData)

    const result = await getPlaceDetailsV1(placeId)

    expect(result.fromCache).toBe(true)
    expect(result.is_deleted).toBe(false)
    expect(placesApiQueue.addToQueue).not.toHaveBeenCalled()
    expect(redisClient.get).toHaveBeenCalledWith(redisKey)
  })

  it('should fetch fresh data if cache is stale', async () => {
    const staleDate = new Date()
    staleDate.setSeconds(
      staleDate.getSeconds() - CACHE_THRESHOLDS.PLACE_UPDATE_THRESHOLD - 1,
    )

    const cachedData = {
      data: mockPlaceData,
      is_deleted: false,
      updated_at: staleDate.toISOString(),
      created_at: new Date().toISOString(),
    }

    vi.mocked(redisClient.get).mockResolvedValue(cachedData)
    vi.mocked(placesApiQueue.addToQueue).mockImplementation(async () => {
      return mockPlaceData
    })

    const result = await getPlaceDetailsV1(placeId)

    expect(result.fromCache).toBe(false)
    expect(placesApiQueue.addToQueue).toHaveBeenCalled()
    expect(redisClient.set).toHaveBeenCalledWith(redisKey, mockPlaceData)
  })

  it('should return cached data if marked as deleted', async () => {
    const cachedData = {
      data: mockPlaceData,
      is_deleted: true,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    vi.mocked(redisClient.get).mockResolvedValue(cachedData)

    const result = await getPlaceDetailsV1(placeId)

    expect(result.fromCache).toBe(true)
    expect(result.is_deleted).toBe(true)
    expect(placesApiQueue.addToQueue).not.toHaveBeenCalled()
  })

  it('should handle API errors and return cached data as fallback', async () => {
    const staleDate = new Date()
    staleDate.setSeconds(
      staleDate.getSeconds() - CACHE_THRESHOLDS.PLACE_UPDATE_THRESHOLD - 1,
    )

    const cachedData = {
      data: mockPlaceData,
      is_deleted: false,
      updated_at: staleDate.toISOString(),
      created_at: new Date().toISOString(),
    }

    vi.mocked(redisClient.get).mockResolvedValue(cachedData)
    vi.mocked(placesApiQueue.addToQueue).mockRejectedValue(
      new Error('API Error'),
    )

    const result = await getPlaceDetailsV1(placeId)

    expect(result.fromCache).toBe(true)
    expect(placesApiQueue.addToQueue).toHaveBeenCalled()
  })

  it('should mark place as deleted when API returns 404', async () => {
    const staleDate = new Date()
    staleDate.setSeconds(
      staleDate.getSeconds() - CACHE_THRESHOLDS.PLACE_UPDATE_THRESHOLD - 1,
    )

    const cachedData = {
      data: mockPlaceData,
      is_deleted: false,
      updated_at: staleDate.toISOString(),
      created_at: new Date().toISOString(),
    }

    vi.mocked(redisClient.get).mockResolvedValue(cachedData)
    vi.mocked(redisClient.markAsDeleted).mockResolvedValue(undefined)

    // Mock fetch to return 404
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: { status: 'NOT_FOUND', message: 'Place not found' },
      }),
    } as Response)

    // Make sure the queue executes our mocked fetch
    vi.mocked(placesApiQueue.addToQueue).mockImplementation(async (fn) => {
      return fn()
    })

    const result = await getPlaceDetailsV1(placeId)

    expect(result.fromCache).toBe(true)
    expect(redisClient.markAsDeleted).toHaveBeenCalledWith(redisKey)

    const deletedCachedData = {
      ...cachedData,
      is_deleted: true,
    }
    vi.mocked(redisClient.get).mockResolvedValue(deletedCachedData)

    const deletedResult = await getPlaceDetailsV1(placeId)
    expect(deletedResult.is_deleted).toBe(true)
    expect(deletedResult.fromCache).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should throw error if no cached data and API fails', async () => {
    vi.mocked(redisClient.get).mockResolvedValue(null)
    vi.mocked(placesApiQueue.addToQueue).mockRejectedValue(
      new Error('API Error'),
    )

    await expect(getPlaceDetailsV1(placeId)).rejects.toThrow('API Error')
  })
})
