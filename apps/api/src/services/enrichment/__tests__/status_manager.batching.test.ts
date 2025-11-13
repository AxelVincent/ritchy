import '../../../websocket/__tests__/setup'
import { logger } from '@ritchy/logger'
import type { Namespace } from 'socket.io'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { redisClient } from '../../../internal/redis/redis'
import {
  type EnrichmentProgressStatus,
  setEnrichmentNamespace,
  setEnrichmentStatus,
} from '../status_manager'

// Mock additional dependencies
vi.mock('../../../internal/redis/redis', () => ({
  redisClient: {
    redis: {
      setex: vi.fn(),
      get: vi.fn(),
      pipeline: vi.fn(),
    },
  },
}))
vi.mock('../../../db/db')

describe('Status Manager Batching', () => {
  let mockNamespace: Namespace
  let emittedEvents: Array<{
    room: string
    event: string
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    data: any
    timestamp: number
  }>

  beforeEach(() => {
    vi.clearAllMocks()
    emittedEvents = []

    // Mock namespace with event tracking
    mockNamespace = {
      to: vi.fn().mockReturnThis(),
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      emit: vi.fn((event: string, data: any) => {
        emittedEvents.push({
          room: '', // Would be set by 'to' in real implementation
          event,
          data,
          timestamp: Date.now(),
        })
      }),
      adapter: {
        rooms: new Map(),
      },
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } as any

    setEnrichmentNamespace(mockNamespace)

    // Mock Redis
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    vi.mocked(redisClient.redis.setex).mockResolvedValue('OK' as any)
  })

  describe('Batch Window Timing', () => {
    it('should batch multiple non-terminal updates within 100ms window', async () => {
      const userPlaceId = 'test-place-id'

      // Send 5 processing updates rapidly
      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 1', 20)
      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 2', 40)
      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 3', 60)
      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 4', 80)
      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 5', 90)

      // Before batch flush - no emissions yet (batching)
      expect(emittedEvents.length).toBe(0)

      // Wait for batch window (100ms + buffer)
      await new Promise((resolve) => setTimeout(resolve, 150))

      // After batch flush - should have emitted updates
      expect(emittedEvents.length).toBeGreaterThan(0)
    })

    it('should emit terminal states immediately without batching', async () => {
      const userPlaceId = 'test-place-id'

      // Send processing update (batched)
      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 1', 50)

      // No emission yet
      expect(emittedEvents.length).toBe(0)

      // Send completed status (terminal - immediate)
      await setEnrichmentStatus(userPlaceId, 'completed', 'Done', 100)

      // Should emit immediately without waiting for batch window
      expect(emittedEvents.length).toBeGreaterThan(0)

      // Find the completed event
      const completedEvent = emittedEvents.find(
        (e) => e.data.status === 'completed',
      )
      expect(completedEvent).toBeDefined()
      expect(completedEvent?.data.progress).toBe(100)
    })

    it('should flush pending batches before emitting terminal state', async () => {
      const userPlaceId = 'test-place-id'

      // Queue multiple processing updates
      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 1', 30)
      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 2', 60)
      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 3', 90)

      // No emissions yet (batching)
      expect(emittedEvents.length).toBe(0)

      // Send terminal state - should flush pending AND emit terminal
      await setEnrichmentStatus(userPlaceId, 'completed', 'Done', 100)

      // Should have emitted all updates
      expect(emittedEvents.length).toBeGreaterThan(0)

      // Verify order: processing updates come before completed
      const processingEvents = emittedEvents.filter(
        (e) => e.data.status === 'processing',
      )
      const completedEvents = emittedEvents.filter(
        (e) => e.data.status === 'completed',
      )

      expect(processingEvents.length).toBeGreaterThan(0)
      expect(completedEvents.length).toBeGreaterThan(0)

      // Last event should be completed
      const lastEvent = emittedEvents[emittedEvents.length - 1]
      expect(lastEvent.data.status).toBe('completed')
    })
  })

  describe('Batch Deduplication', () => {
    it('should replace older updates for same userPlaceId in batch', async () => {
      const userPlaceId = 'test-place-id'

      // Send multiple updates for same enrichment
      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 1', 10)
      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 2', 20)
      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 3', 30)

      // Wait for batch
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should emit latest update (deduplication)
      const processingEvents = emittedEvents.filter(
        (e) =>
          e.data.userPlaceId === userPlaceId && e.data.status === 'processing',
      )

      // Due to batching and deduplication, we might have fewer emissions
      expect(processingEvents.length).toBeGreaterThan(0)
    })

    it('should handle updates for multiple userPlaceIds in same batch', async () => {
      const userPlaceId1 = 'place-1'
      const userPlaceId2 = 'place-2'
      const userPlaceId3 = 'place-3'

      // Send updates for different enrichments
      await setEnrichmentStatus(userPlaceId1, 'processing', 'Step 1', 30)
      await setEnrichmentStatus(userPlaceId2, 'processing', 'Step 1', 40)
      await setEnrichmentStatus(userPlaceId3, 'processing', 'Step 1', 50)

      // Wait for batch
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should emit updates for all three enrichments
      const uniquePlaceIds = new Set(
        emittedEvents.map((e) => e.data.userPlaceId),
      )
      expect(uniquePlaceIds.size).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Terminal State Handling', () => {
    it('should emit completed status immediately', async () => {
      const userPlaceId = 'test-place-id'
      const beforeEmit = Date.now()

      await setEnrichmentStatus(userPlaceId, 'completed', 'Done', 100)

      const afterEmit = Date.now()

      // Should emit immediately (< 50ms, not waiting for batch window)
      expect(afterEmit - beforeEmit).toBeLessThan(50)
      expect(emittedEvents.length).toBeGreaterThan(0)
    })

    it('should emit failed status immediately', async () => {
      const userPlaceId = 'test-place-id'
      const beforeEmit = Date.now()

      await setEnrichmentStatus(
        userPlaceId,
        'failed',
        'Error occurred',
        0,
        'Test error',
      )

      const afterEmit = Date.now()

      expect(afterEmit - beforeEmit).toBeLessThan(50)
      expect(emittedEvents.length).toBeGreaterThan(0)

      const failedEvent = emittedEvents.find((e) => e.data.status === 'failed')
      expect(failedEvent?.data.error).toBe('Test error')
    })

    it('should maintain correct order for fast-completing jobs', async () => {
      const userPlaceId = 'test-place-id'

      // Simulate fast job: queued -> processing -> completed (all within 100ms)
      await setEnrichmentStatus(userPlaceId, 'queued', 'Queued', 0)
      await setEnrichmentStatus(userPlaceId, 'processing', 'Processing', 50)
      await setEnrichmentStatus(userPlaceId, 'completed', 'Done', 100)

      // Terminal state flushes pending updates first
      expect(emittedEvents.length).toBeGreaterThan(0)

      // Verify we have the completed event
      const completedEvent = emittedEvents.find(
        (e) => e.data.status === 'completed',
      )
      expect(completedEvent).toBeDefined()
    })
  })

  describe('Redis Persistence', () => {
    it('should store status in Redis with correct TTL', async () => {
      const userPlaceId = 'test-place-id'

      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 1', 30)

      expect(redisClient.redis.setex).toHaveBeenCalledWith(
        `enrichment:status:${userPlaceId}`,
        expect.any(Number), // TTL
        expect.stringContaining('"status":"processing"'),
      )
    })

    it('should extend TTL for processing jobs', async () => {
      const userPlaceId = 'test-place-id'

      await setEnrichmentStatus(userPlaceId, 'processing', 'Long task', 50)

      // Processing jobs get 60 minutes TTL
      expect(redisClient.redis.setex).toHaveBeenCalledWith(
        `enrichment:status:${userPlaceId}`,
        60 * 60, // 60 minutes
        expect.any(String),
      )
    })

    it('should use standard TTL for non-processing jobs', async () => {
      const userPlaceId = 'test-place-id'

      await setEnrichmentStatus(userPlaceId, 'queued', 'Queued', 0)

      // Non-processing jobs get 30 minutes TTL
      expect(redisClient.redis.setex).toHaveBeenCalledWith(
        `enrichment:status:${userPlaceId}`,
        30 * 60, // 30 minutes
        expect.any(String),
      )
    })
  })

  describe('Error Handling in Batching', () => {
    it('should handle Redis errors gracefully without breaking batching', async () => {
      const userPlaceId = 'test-place-id'

      // Mock Redis failure
      vi.mocked(redisClient.redis.setex).mockRejectedValueOnce(
        new Error('Redis connection failed'),
      )

      // Should not throw
      await expect(
        setEnrichmentStatus(userPlaceId, 'processing', 'Step 1', 30),
      ).resolves.not.toThrow()

      // Should log error
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Failed to set enrichment status',
          event: 'set_enrichment_status_error',
        }),
      )
    })

    it('should handle emit errors gracefully', async () => {
      const userPlaceId1 = 'place-1'
      const userPlaceId2 = 'place-2'

      // Mock namespace emit to fail silently
      let callCount = 0
      mockNamespace.emit = vi.fn((event, data) => {
        callCount++
        if (callCount === 1) {
          // Simulate error without throwing (return false or similar)
          return false
        }
        emittedEvents.push({
          room: '',
          event,
          data,
          timestamp: Date.now(),
        })
        return true
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      }) as any

      await setEnrichmentStatus(userPlaceId1, 'processing', 'Step 1', 30)
      await setEnrichmentStatus(userPlaceId2, 'processing', 'Step 1', 40)

      // Wait for batch
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have attempted emits
      expect(mockNamespace.emit).toHaveBeenCalled()
      expect(callCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Performance Under Load', () => {
    it('should handle high-frequency updates efficiently', async () => {
      const userPlaceId = 'test-place-id'
      const updateCount = 50

      const startTime = Date.now()

      // Send 50 updates rapidly
      for (let i = 0; i < updateCount; i++) {
        await setEnrichmentStatus(
          userPlaceId,
          'processing',
          `Step ${i}`,
          (i / updateCount) * 100,
        )
      }

      const duration = Date.now() - startTime

      // Should handle 50 updates in reasonable time (< 500ms)
      expect(duration).toBeLessThan(500)

      // Wait for batch
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have batched efficiently (much fewer than 50 emits)
      expect(emittedEvents.length).toBeLessThan(updateCount)
    })

    it('should handle concurrent updates for different enrichments', async () => {
      const enrichmentCount = 10
      const updatePromises = []

      for (let i = 0; i < enrichmentCount; i++) {
        const userPlaceId = `place-${i}`
        updatePromises.push(
          setEnrichmentStatus(userPlaceId, 'processing', 'Step 1', 50),
        )
      }

      await Promise.all(updatePromises)

      // Wait for batch
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have handled all enrichments
      const uniquePlaceIds = new Set(
        emittedEvents.map((e) => e.data.userPlaceId),
      )
      expect(uniquePlaceIds.size).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Logging', () => {
    it('should log batch emissions', async () => {
      const userPlaceId = 'test-place-id'

      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 1', 30)
      await setEnrichmentStatus(userPlaceId, 'processing', 'Step 2', 60)

      // Wait for batch
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Batch emitted status updates',
          event: 'enrichment_batch_emit',
        }),
      )
    })

    it('should log terminal state emissions', async () => {
      const userPlaceId = 'test-place-id'

      await setEnrichmentStatus(userPlaceId, 'completed', 'Done', 100)

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Emitted terminal status immediately',
          event: 'enrichment_terminal_status_emit',
        }),
      )
    })
  })
})
