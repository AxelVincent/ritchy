import { logger } from '@ritchy/logger'
import type { PubSubMessage } from './pubsub'
import { redisClient } from './redis'

const STATUS_QUEUE_KEY = 'enrichment:status:queue'
const DEAD_LETTER_QUEUE_KEY = 'enrichment:status:dlq'
const CONSUMER_LOCK_KEY = 'enrichment:status:consumer:lock'
const LOCK_TTL_MS = 5000

interface PollingConfig {
  minIntervalMs: number
  maxIntervalMs: number
  batchSize: number
}

const DEFAULT_CONFIG: PollingConfig = {
  minIntervalMs: 10,
  maxIntervalMs: 500,
  batchSize: 100,
}

/**
 * Adaptive polling consumer for Redis queue
 *
 * Features:
 * - Adaptive polling interval based on queue activity
 * - Distributed lock for multi-instance coordination
 * - Dead letter queue for failed messages
 * - Batch processing with backpressure
 */
export class AdaptivePollingConsumer {
  private isRunning = false
  private currentInterval: number
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private lockRenewalInterval: ReturnType<typeof setInterval> | null = null
  private instanceId: string
  private config: PollingConfig
  private onMessage: (message: PubSubMessage) => void
  private consecutiveEmptyPolls = 0

  constructor(
    onMessage: (message: PubSubMessage) => void,
    config: Partial<PollingConfig> = {},
  ) {
    this.onMessage = onMessage
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.currentInterval = this.config.maxIntervalMs
    this.instanceId = `consumer:${process.pid}:${Date.now()}`
  }

  async start(): Promise<void> {
    if (this.isRunning) return
    this.isRunning = true

    logger.info({
      msg: 'Adaptive polling consumer starting',
      event: 'polling_consumer_start',
      metadata: { instanceId: this.instanceId, config: this.config },
    })

    this.startLockRenewal()
    this.poll()
  }

  async stop(): Promise<void> {
    this.isRunning = false

    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    if (this.lockRenewalInterval) {
      clearInterval(this.lockRenewalInterval)
      this.lockRenewalInterval = null
    }

    await this.releaseLock()

    logger.info({
      msg: 'Adaptive polling consumer stopped',
      event: 'polling_consumer_stop',
      metadata: { instanceId: this.instanceId },
    })
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return

    try {
      const hasLock = await this.acquireOrRenewLock()
      if (!hasLock) {
        // Another instance is consuming, wait and retry
        this.scheduleNextPoll(this.config.maxIntervalMs)
        return
      }

      const messagesProcessed = await this.processBatch()

      // Adapt polling interval based on queue activity
      if (messagesProcessed > 0) {
        this.consecutiveEmptyPolls = 0
        this.currentInterval = this.config.minIntervalMs
      } else {
        this.consecutiveEmptyPolls++
        // Exponential backoff up to maxInterval
        this.currentInterval = Math.min(
          this.config.minIntervalMs * 2 ** this.consecutiveEmptyPolls,
          this.config.maxIntervalMs,
        )
      }
    } catch (error) {
      logger.error({
        msg: 'Polling consumer error',
        event: 'polling_consumer_error',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
      this.currentInterval = this.config.maxIntervalMs
    }

    this.scheduleNextPoll(this.currentInterval)
  }

  private scheduleNextPoll(delay: number): void {
    this.timeoutId = setTimeout(() => this.poll(), delay)
  }

  private async processBatch(): Promise<number> {
    let processed = 0

    for (let i = 0; i < this.config.batchSize; i++) {
      const messageStr = await redisClient.redis.rpop(STATUS_QUEUE_KEY)
      if (messageStr === null) break

      try {
        const message = JSON.parse(messageStr) as PubSubMessage
        this.onMessage(message)
        processed++
      } catch (parseError) {
        await this.sendToDeadLetterQueue(messageStr, parseError)
      }
    }

    if (processed > 0) {
      logger.debug({
        msg: 'Batch processed',
        event: 'polling_batch_processed',
        metadata: { count: processed },
      })
    }

    return processed
  }

  private async sendToDeadLetterQueue(
    messageStr: string,
    error: unknown,
  ): Promise<void> {
    try {
      const dlqEntry = JSON.stringify({
        originalMessage: messageStr,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        consumerId: this.instanceId,
      })

      await redisClient.redis.lpush(DEAD_LETTER_QUEUE_KEY, dlqEntry)
      // Keep DLQ bounded to 1000 entries
      await redisClient.redis.ltrim(DEAD_LETTER_QUEUE_KEY, 0, 999)

      logger.warn({
        msg: 'Message sent to dead letter queue',
        event: 'polling_dlq_message',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
    } catch (dlqError) {
      logger.error({
        msg: 'Failed to send to dead letter queue',
        event: 'polling_dlq_error',
        metadata: {
          error:
            dlqError instanceof Error ? dlqError.message : String(dlqError),
        },
      })
    }
  }

  private async acquireOrRenewLock(): Promise<boolean> {
    // Use SET NX PX for atomic lock acquisition
    const result = await redisClient.redis.set(
      CONSUMER_LOCK_KEY,
      this.instanceId,
      'PX',
      LOCK_TTL_MS,
      'NX',
    )

    if (result === 'OK') return true

    // Check if we already own the lock
    const currentOwner = await redisClient.redis.get(CONSUMER_LOCK_KEY)
    if (currentOwner === this.instanceId) {
      await redisClient.redis.pexpire(CONSUMER_LOCK_KEY, LOCK_TTL_MS)
      return true
    }

    return false
  }

  private startLockRenewal(): void {
    // Renew lock every LOCK_TTL/2 to prevent expiration
    this.lockRenewalInterval = setInterval(async () => {
      if (!this.isRunning) return

      try {
        const currentOwner = await redisClient.redis.get(CONSUMER_LOCK_KEY)
        if (currentOwner === this.instanceId) {
          await redisClient.redis.pexpire(CONSUMER_LOCK_KEY, LOCK_TTL_MS)
        }
      } catch (error) {
        logger.error({
          msg: 'Failed to renew consumer lock',
          event: 'polling_lock_renewal_error',
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }, LOCK_TTL_MS / 2)
  }

  private async releaseLock(): Promise<void> {
    try {
      const currentOwner = await redisClient.redis.get(CONSUMER_LOCK_KEY)
      if (currentOwner === this.instanceId) {
        await redisClient.redis.del(CONSUMER_LOCK_KEY)
      }
    } catch (error) {
      logger.error({
        msg: 'Failed to release consumer lock',
        event: 'polling_lock_release_error',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  /**
   * Get current consumer status for health checks
   */
  getStatus(): {
    isRunning: boolean
    instanceId: string
    currentInterval: number
    consecutiveEmptyPolls: number
  } {
    return {
      isRunning: this.isRunning,
      instanceId: this.instanceId,
      currentInterval: this.currentInterval,
      consecutiveEmptyPolls: this.consecutiveEmptyPolls,
    }
  }
}
