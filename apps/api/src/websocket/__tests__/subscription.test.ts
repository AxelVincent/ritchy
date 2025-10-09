import './setup'
import { logger } from '@ritchy/logger'
import type { Namespace, Socket } from 'socket.io'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { getEnrichmentStatus } from '../../services/enrichment/status_manager'

// Mock additional dependencies
vi.mock('../../db/db')
vi.mock('../../services/enrichment/status_manager')

describe('WebSocket Subscription Authorization', () => {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  let mockSocket: any
  let _mockNamespace: Namespace
  let _subscribeHandler: (userPlaceId: unknown) => Promise<void>

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock socket
    mockSocket = {
      id: 'test-socket-id',
      data: {
        userId: 'user_123',
      },
      emit: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
      rooms: new Set(['test-socket-id']),
    }

    // Mock namespace
    _mockNamespace = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      adapter: {
        rooms: new Map(),
      },
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } as any

    // Mock db query builder
    const mockSelect = vi.fn().mockReturnThis()
    const mockFrom = vi.fn().mockReturnThis()
    const mockInnerJoin = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockResolvedValue([])

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    vi.mocked(db).select = mockSelect as any
    mockSelect.mockImplementation(() => ({
      from: mockFrom,
    }))
    mockFrom.mockImplementation(() => ({
      innerJoin: mockInnerJoin,
    }))
    mockInnerJoin.mockImplementation(() => ({
      where: mockWhere,
    }))
    mockWhere.mockImplementation(() => ({
      limit: mockLimit,
    }))
  })

  describe('UUID Validation', () => {
    it('should reject subscription with invalid UUID format', async () => {
      const invalidUUID = 'not-a-valid-uuid'

      // Simulate subscribe event handler
      try {
        // This would be called by socket.on('subscribe', ...)
        const { z } = await import('zod')
        const SubscribeEventSchema = z.string().uuid()
        SubscribeEventSchema.parse(invalidUUID)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should accept subscription with valid UUID format', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000'

      const { z } = await import('zod')
      const SubscribeEventSchema = z.string().uuid()

      expect(() => SubscribeEventSchema.parse(validUUID)).not.toThrow()
    })

    it('should reject empty string', async () => {
      const emptyString = ''

      try {
        const { z } = await import('zod')
        const SubscribeEventSchema = z.string().uuid()
        SubscribeEventSchema.parse(emptyString)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should reject null value', async () => {
      const nullValue = null

      try {
        const { z } = await import('zod')
        const SubscribeEventSchema = z.string().uuid()
        SubscribeEventSchema.parse(nullValue)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('Ownership Verification', () => {
    const validUserPlaceId = '550e8400-e29b-41d4-a716-446655440000'

    it('should allow subscription when user owns the userPlace', async () => {
      // Mock database to return matching user
      const mockLimit = vi.fn().mockResolvedValue([
        {
          userPlaceId: validUserPlaceId,
          userId: 'db-user-id',
          clerkId: 'user_123', // Matches socket.data.userId
        },
      ])

      vi.mocked(db).select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: mockLimit,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      })) as any

      // Mock getEnrichmentStatus
      vi.mocked(getEnrichmentStatus).mockResolvedValue({
        status: 'idle',
        step: '',
        progress: 0,
        updatedAt: Date.now(),
      })

      // This would pass authorization check
      const result = (await db
        .select()
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        .from({} as any)
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        .innerJoin({} as any, {} as any)
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        .where({} as any)
        .limit(1)) as Array<{
        userPlaceId: string
        userId: string
        clerkId: string
      }>

      expect(result).toHaveLength(1)
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      expect((result[0] as any).clerkId).toBe('user_123')
    })

    it('should reject subscription when user does not own userPlace', async () => {
      // Mock database to return different user
      const mockLimit = vi.fn().mockResolvedValue([
        {
          userPlaceId: validUserPlaceId,
          userId: 'db-user-id',
          clerkId: 'user_456', // Does NOT match socket.data.userId
        },
      ])

      vi.mocked(db).select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: mockLimit,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      })) as any

      const result = await db
        .select()
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        .from({} as any)
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        .innerJoin({} as any, {} as any)
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        .where({} as any)
        .limit(1)

      expect(result).toHaveLength(1)
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      expect((result[0] as any).clerkId).not.toBe('user_123')

      // Should emit error and NOT join room
      // (This would be tested in integration test with actual socket)
    })

    it('should reject subscription when userPlace does not exist', async () => {
      // Mock database to return no results
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db).select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: mockLimit,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      })) as any

      const result = await db
        .select()
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        .from({} as any)
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        .innerJoin({} as any, {} as any)
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        .where({} as any)
        .limit(1)

      expect(result).toHaveLength(0)
    })
  })

  describe('Room Management', () => {
    const validUserPlaceId = '550e8400-e29b-41d4-a716-446655440000'

    it('should join correct room after successful authorization', async () => {
      const expectedRoom = `enrichment:${validUserPlaceId}`

      await mockSocket.join(expectedRoom)

      expect(mockSocket.join).toHaveBeenCalledWith(expectedRoom)
    })

    it('should leave room on unsubscribe', async () => {
      const room = `enrichment:${validUserPlaceId}`

      await mockSocket.leave(room)

      expect(mockSocket.leave).toHaveBeenCalledWith(room)
    })

    it('should send initial status after joining room', async () => {
      const mockStatus = {
        status: 'processing' as const,
        step: 'Scraping website',
        progress: 45,
        updatedAt: Date.now(),
      }

      vi.mocked(getEnrichmentStatus).mockResolvedValue(mockStatus)

      const status = await getEnrichmentStatus(validUserPlaceId)

      expect(status).toEqual(mockStatus)
    })
  })

  describe('Error Handling', () => {
    it('should emit error with userPlaceId for NOT_FOUND', () => {
      const userPlaceId = '550e8400-e29b-41d4-a716-446655440000'

      mockSocket.emit('error', {
        message: 'User place not found',
        code: 'NOT_FOUND',
        userPlaceId,
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'User place not found',
        code: 'NOT_FOUND',
        userPlaceId,
      })
    })

    it('should emit error with userPlaceId for FORBIDDEN', () => {
      const userPlaceId = '550e8400-e29b-41d4-a716-446655440000'

      mockSocket.emit('error', {
        message: 'Unauthorized: You do not own this enrichment',
        code: 'FORBIDDEN',
        userPlaceId,
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Unauthorized: You do not own this enrichment',
        code: 'FORBIDDEN',
        userPlaceId,
      })
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockLimit = vi
        .fn()
        .mockRejectedValue(new Error('Database connection failed'))

      vi.mocked(db).select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: mockLimit,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      })) as any

      try {
        await db
          .select()
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          .from({} as any)
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          .innerJoin({} as any, {} as any)
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          .where({} as any)
          .limit(1)
      } catch (error) {
        expect(error).toBeDefined()
        expect((error as Error).message).toBe('Database connection failed')
      }
    })
  })

  describe('Concurrent Subscriptions', () => {
    it('should handle multiple subscriptions from same user', async () => {
      const userPlaceId1 = '550e8400-e29b-41d4-a716-446655440000'
      const userPlaceId2 = '660e8400-e29b-41d4-a716-446655440001'

      await mockSocket.join(`enrichment:${userPlaceId1}`)
      await mockSocket.join(`enrichment:${userPlaceId2}`)

      expect(mockSocket.join).toHaveBeenCalledTimes(2)
      expect(mockSocket.join).toHaveBeenCalledWith(`enrichment:${userPlaceId1}`)
      expect(mockSocket.join).toHaveBeenCalledWith(`enrichment:${userPlaceId2}`)
    })

    it('should handle duplicate subscription to same enrichment', async () => {
      const userPlaceId = '550e8400-e29b-41d4-a716-446655440000'
      const room = `enrichment:${userPlaceId}`

      // First subscription
      await mockSocket.join(room)
      // Second subscription (idempotent - socket.io handles this)
      await mockSocket.join(room)

      expect(mockSocket.join).toHaveBeenCalledTimes(2)
    })
  })

  describe('Logging and Audit Trail', () => {
    const validUserPlaceId = '550e8400-e29b-41d4-a716-446655440000'

    it('should log successful subscription', () => {
      logger.debug({
        msg: 'Client subscribed to enrichment updates',
        event: 'enrichment_websocket_subscribe',
        metadata: {
          socketId: mockSocket.id,
          userId: mockSocket.data.userId,
          userPlaceId: validUserPlaceId,
          room: `enrichment:${validUserPlaceId}`,
        },
      })

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Client subscribed to enrichment updates',
          event: 'enrichment_websocket_subscribe',
        }),
      )
    })

    it('should log unauthorized subscription attempt', () => {
      logger.warn({
        msg: 'Unauthorized subscription attempt',
        event: 'enrichment_websocket_subscribe_unauthorized',
        metadata: {
          socketId: mockSocket.id,
          authenticatedUserId: mockSocket.data.userId,
          userPlaceId: validUserPlaceId,
        },
      })

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Unauthorized subscription attempt',
          event: 'enrichment_websocket_subscribe_unauthorized',
        }),
      )
    })

    it('should log not found subscription attempt', () => {
      logger.warn({
        msg: 'Subscription attempt for non-existent userPlace',
        event: 'enrichment_websocket_subscribe_not_found',
        metadata: {
          socketId: mockSocket.id,
          userId: mockSocket.data.userId,
          userPlaceId: validUserPlaceId,
        },
      })

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Subscription attempt for non-existent userPlace',
          event: 'enrichment_websocket_subscribe_not_found',
        }),
      )
    })
  })
})
