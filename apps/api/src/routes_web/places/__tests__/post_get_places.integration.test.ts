import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi
} from 'vitest'
import request from 'supertest'
import { app } from '../../../index'
import { db } from '../../../db/db'
import {
  user,
  list,
  listPlace,
  search,
  status,
  note,
  contact,
  contactEmail
} from '../../../db/schema'
import { redisClient } from '../../../external/redis/redis'
import type { FilterCondition } from '@ritchy/types'
import type { Request, Response, NextFunction } from 'express'

// Mock auth middleware
vi.mock('../../../middleware/request_metadata', () => ({
  requestMetadata: (req: Request, _res: Response, next: NextFunction) => {
    req.metadata = {
      ipAddress: '127.0.0.1',
      userAgent: 'test',
      requestId: 'test-id',
      timestamp: new Date()
    }
    next()
  }
}))

describe('POST /places - Integration Tests', () => {
  let testUserId: string
  let testListId: string
  let testSearchId: string
  let testPlaceIds: string[]

  beforeAll(async () => {
    // Clean up and setup test data
    await db.delete(user)

    // Create test user
    const [testUser] = await db
      .insert(user)
      .values({
        clerkId: 'test-clerk-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      })
      .returning()
    testUserId = testUser.id

    // Create test list
    const [testList] = await db
      .insert(list)
      .values({
        name: 'Test List',
        emoji: '🧪',
        userId: testUserId
      })
      .returning()
    testListId = testList.id

    // Create test search
    const [testSearch] = await db
      .insert(search)
      .values({
        userId: testUserId,
        placeName: 'Test Place',
        keyword: 'restaurant',
        model: 'BASIC',
        rectangle: {
          northEast: { latitude: 40.7829, longitude: -73.9654 },
          southWest: { latitude: 40.7489, longitude: -74.006 }
        }
      })
      .returning()
    testSearchId = testSearch.id

    // Create test places
    testPlaceIds = ['place-1', 'place-2', 'place-3']

    for (const placeId of testPlaceIds) {
      await db.insert(listPlace).values({
        listId: testListId,
        placeId,
        searchId: testSearchId
      })
    }

    // Create test statuses
    await db.insert(status).values([
      { placeId: 'place-1', userId: testUserId, status: 'NEW' },
      { placeId: 'place-2', userId: testUserId, status: 'CONTACTED' }
    ])

    // Create test notes
    await db.insert(note).values([
      { placeId: 'place-1', userId: testUserId, note: 'Important lead' },
      { placeId: 'place-2', userId: testUserId, note: 'Follow up needed' }
    ])

    // Create test contacts and emails
    const [contact1] = await db
      .insert(contact)
      .values({
        placeId: 'place-1',
        userId: testUserId,
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@restaurant.com'
      })
      .returning()

    await db.insert(contactEmail).values({
      contactId: contact1.id,
      email: 'john@restaurant.com',
      isPrimary: true
    })

    // Mock Redis place data
    const mockPlaceData = {
      data: {
        id: 'place-1',
        name: 'Test Restaurant',
        priceLevel: 2,
        businessStatus: 'OPERATIONAL'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    vi.spyOn(redisClient, 'get').mockImplementation(async (key: string) => {
      if (key.startsWith('place:')) {
        return mockPlaceData
      }
      if (key.startsWith('search:')) {
        return {
          data: testPlaceIds,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
      return null
    })

    vi.spyOn(redisClient, 'checkPlaceKeysExistence').mockResolvedValue(
      Object.fromEntries(testPlaceIds.map((id) => [id, true]))
    )

    // Mock RediSearch
    vi.spyOn(redisClient.redis, 'call').mockImplementation(
      async (command: string, ...args: any[]) => {
        if (command === 'FT.SEARCH') {
          return [
            1, // count
            'place:place-1',
            ['$', JSON.stringify(mockPlaceData)]
          ]
        }
        return []
      }
    )
  })

  afterAll(async () => {
    vi.restoreAllMocks()
    await db.delete(user)
  })

  describe('PostgreSQL Filtering', () => {
    it('should filter by list ID', async () => {
      const filter: FilterCondition = {
        operator: 'equals',
        field: 'list.id',
        value: testListId
      }

      const response = await request(app)
        .post('/places')
        .set('Authorization', 'Bearer test-token')
        .send({ filters: filter })
        .expect(200)

      expect(response.body.places).toBeDefined()
      expect(Array.isArray(response.body.places)).toBe(true)
    })

    it('should filter by status', async () => {
      const filter: FilterCondition = {
        operator: 'AND',
        conditions: [
          { operator: 'equals', field: 'list.id', value: testListId },
          { operator: 'equals', field: 'status.status', value: 'NEW' }
        ]
      }

      const response = await request(app)
        .post('/places')
        .set('Authorization', 'Bearer test-token')
        .send({ filters: filter })
        .expect(200)

      expect(response.body.places).toBeDefined()
    })

    it('should filter by note content', async () => {
      const filter: FilterCondition = {
        operator: 'AND',
        conditions: [
          { operator: 'equals', field: 'list.id', value: testListId },
          { operator: 'contains', field: 'note.note', value: 'Important' }
        ]
      }

      const response = await request(app)
        .post('/places')
        .set('Authorization', 'Bearer test-token')
        .send({ filters: filter })
        .expect(200)

      expect(response.body.places).toBeDefined()
    })

    it('should filter by contact email', async () => {
      const filter: FilterCondition = {
        operator: 'AND',
        conditions: [
          { operator: 'equals', field: 'list.id', value: testListId },
          {
            operator: 'contains',
            field: 'contact_email.email',
            value: 'restaurant.com'
          }
        ]
      }

      const response = await request(app)
        .post('/places')
        .set('Authorization', 'Bearer test-token')
        .send({ filters: filter })
        .expect(200)

      expect(response.body.places).toBeDefined()
    })
  })

  describe('Complex Recursive Filtering', () => {
    it('should handle nested AND/OR conditions', async () => {
      const filter: FilterCondition = {
        operator: 'AND',
        conditions: [
          { operator: 'equals', field: 'list.id', value: testListId },
          {
            operator: 'OR',
            conditions: [
              { operator: 'equals', field: 'status.status', value: 'NEW' },
              { operator: 'contains', field: 'note.note', value: 'Follow up' }
            ]
          }
        ]
      }

      const response = await request(app)
        .post('/places')
        .set('Authorization', 'Bearer test-token')
        .send({ filters: filter })
        .expect(200)

      expect(response.body.places).toBeDefined()
    })

    it('should handle deeply nested conditions', async () => {
      const filter: FilterCondition = {
        operator: 'AND',
        conditions: [
          { operator: 'equals', field: 'list.id', value: testListId },
          {
            operator: 'OR',
            conditions: [
              {
                operator: 'AND',
                conditions: [
                  { operator: 'equals', field: 'status.status', value: 'NEW' },
                  {
                    operator: 'contains',
                    field: 'note.note',
                    value: 'Important'
                  }
                ]
              },
              { operator: 'equals', field: 'status.status', value: 'CONTACTED' }
            ]
          }
        ]
      }

      const response = await request(app)
        .post('/places')
        .set('Authorization', 'Bearer test-token')
        .send({ filters: filter })
        .expect(200)

      expect(response.body.places).toBeDefined()
    })
  })

  describe('Mixed PostgreSQL and Redis Filtering', () => {
    it('should handle mixed field types in complex filters', async () => {
      const filter: FilterCondition = {
        operator: 'AND',
        conditions: [
          { operator: 'equals', field: 'list.id', value: testListId },
          {
            operator: 'OR',
            conditions: [
              { operator: 'equals', field: 'status.status', value: 'NEW' }, // PostgreSQL
              { operator: 'contains', field: 'name', value: 'Restaurant' }, // Redis
              { operator: 'less_than', field: 'price', value: 3 } // Redis
            ]
          }
        ]
      }

      const response = await request(app)
        .post('/places')
        .set('Authorization', 'Bearer test-token')
        .send({ filters: filter })
        .expect(200)

      expect(response.body.places).toBeDefined()
    })
  })

  describe('Search Context', () => {
    it('should handle search-based filtering', async () => {
      const filter: FilterCondition = {
        operator: 'AND',
        conditions: [
          { operator: 'equals', field: 'search.id', value: testSearchId },
          { operator: 'equals', field: 'status.status', value: 'NEW' }
        ]
      }

      const response = await request(app)
        .post('/places')
        .set('Authorization', 'Bearer test-token')
        .send({ filters: filter })
        .expect(200)

      expect(response.body.places).toBeDefined()
    })
  })

  describe('Error Cases', () => {
    it('should return 400 for invalid filter structure', async () => {
      const filter: FilterCondition = {
        operator: 'invalid' as any,
        field: 'list.id',
        value: testListId
      }

      await request(app)
        .post('/places')
        .set('Authorization', 'Bearer test-token')
        .send({ filters: filter })
        .expect(400)
    })

    it('should return 400 when neither list nor search ID is provided', async () => {
      const filter: FilterCondition = {
        operator: 'equals',
        field: 'status.status',
        value: 'NEW'
      }

      const response = await request(app)
        .post('/places')
        .set('Authorization', 'Bearer test-token')
        .send({ filters: filter })
        .expect(400)

      expect(response.body.error).toBe('Invalid request')
    })

    it('should return 404 for non-existent list', async () => {
      const filter: FilterCondition = {
        operator: 'equals',
        field: 'list.id',
        value: 'non-existent-list-id'
      }

      await request(app)
        .post('/places')
        .set('Authorization', 'Bearer test-token')
        .send({ filters: filter })
        .expect(404)
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle empty filter conditions', async () => {
      const filter: FilterCondition = {
        operator: 'AND',
        conditions: []
      }

      // This should be handled gracefully
      const response = await request(app)
        .post('/places')
        .set('Authorization', 'Bearer test-token')
        .send({ filters: filter })

      expect([200, 400]).toContain(response.status)
    })

    it('should handle single condition in array', async () => {
      const filter: FilterCondition = {
        operator: 'AND',
        conditions: [
          { operator: 'equals', field: 'list.id', value: testListId }
        ]
      }

      const response = await request(app)
        .post('/places')
        .set('Authorization', 'Bearer test-token')
        .send({ filters: filter })
        .expect(200)

      expect(response.body.places).toBeDefined()
    })
  })
})
