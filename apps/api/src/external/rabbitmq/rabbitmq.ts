import { logger } from '@ritchy/logger'
import amqp from 'amqplib'
import {
  type ConnectionState,
  type JobProcessor,
  QUEUE_CONFIG,
  type QueueHealth,
  type QueueMessage,
  type QueueStats,
  RABBITMQ_CONFIG,
} from '../../config/rabbitmq'

type QueueOptions = {
  /** Priority for the message (higher = more important) */
  priority?: number
  /** Number of retries attempted */
  retryCount?: number
  /** Delay before processing (not implemented yet) */
  delay?: number
}

type ProcessOptions = {
  /** Number of concurrent jobs to process */
  concurrency?: number
  /** Number of messages to prefetch */
  prefetchCount?: number
}

const DELETED_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days for DLQ messages

/**
 * Creates a RabbitMQ client with queue management utilities
 * Follows the same pattern as Redis client for consistency
 *
 * @example
 * ```ts
 * // Basic usage
 * const client = createRabbitMQClient()
 *
 * // Add job to queue
 * const jobId = await client.addJob('my-queue', { data: 'example' })
 *
 * // Process jobs from queue
 * await client.processJobs('my-queue', async (data, messageId) => {
 *   console.log('Processing:', data)
 * })
 *
 * // Get queue stats
 * const stats = await client.getQueueStats('my-queue')
 * ```
 *
 * @returns Object containing RabbitMQ client and utility methods
 */
const createRabbitMQClient = () => {
  let connection: amqp.ChannelModel | null = null
  let channel: amqp.Channel | null = null
  let state: ConnectionState = 'disconnected'
  let reconnectAttempts = 0
  let isShuttingDown = false
  let reconnectTimeout: NodeJS.Timeout | null = null
  const processors = new Map<string, JobProcessor<unknown>>()
  const activeChannels = new Set<amqp.Channel>()

  const maxReconnectAttempts = 10
  const baseReconnectDelay = 1000

  // Create connection with retry strategy
  const createConnection = async (): Promise<{
    connection: amqp.ChannelModel
    channel: amqp.Channel
  }> => {
    try {
      logger.info({
        msg: 'Connecting to RabbitMQ',
        event: 'rabbitmq_connecting',
        metadata: {
          host: RABBITMQ_CONFIG.HOST,
          port: RABBITMQ_CONFIG.PORT,
          vhost: RABBITMQ_CONFIG.VHOST,
        },
      })

      const newConnection = await amqp.connect(RABBITMQ_CONFIG.URL)
      const newChannel = await newConnection.createChannel()

      // Set up connection event handlers
      newConnection.on('error', (error: Error) => {
        logger.error({
          msg: 'RabbitMQ connection error',
          event: 'rabbitmq_connection_error',
          metadata: { error: error.message },
        })
        handleConnectionError()
      })

      newConnection.on('close', () => {
        logger.warn({
          msg: 'RabbitMQ connection closed',
          event: 'rabbitmq_connection_closed',
        })
        handleConnectionClose()
      })

      newChannel.on('error', (error: Error) => {
        logger.error({
          msg: 'RabbitMQ channel error',
          event: 'rabbitmq_channel_error',
          metadata: { error: error.message },
        })
        handleChannelError()
      })

      newChannel.on('return', (msg: amqp.Message) => {
        logger.warn({
          msg: 'RabbitMQ message returned',
          event: 'rabbitmq_message_returned',
          metadata: {
            routingKey: msg.fields.routingKey,
            exchange: msg.fields.exchange,
          },
        })
      })

      connection = newConnection
      channel = newChannel
      state = 'connected'
      reconnectAttempts = 0

      logger.info({
        msg: 'RabbitMQ connected successfully',
        event: 'rabbitmq_connected',
      })

      return { connection: newConnection, channel: newChannel }
    } catch (error) {
      state = 'error'
      connection = null
      channel = null

      logger.error({
        msg: 'Failed to connect to RabbitMQ',
        event: 'rabbitmq_connection_failed',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          attempt: reconnectAttempts + 1,
        },
      })

      throw error
    }
  }

  // Handle connection errors with automatic reconnection
  const handleConnectionError = (): void => {
    if (isShuttingDown) return
    state = 'error'
    scheduleReconnect()
  }

  const handleConnectionClose = (): void => {
    if (isShuttingDown) return
    state = 'disconnected'
    connection = null
    channel = null
    scheduleReconnect()
  }

  const handleChannelError = (): void => {
    if (isShuttingDown) return
    channel = null
    scheduleReconnect()
  }

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = (): void => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
    }

    if (reconnectAttempts >= maxReconnectAttempts) {
      logger.error({
        msg: 'Max reconnection attempts reached',
        event: 'rabbitmq_max_reconnect_attempts',
        metadata: { maxAttempts: maxReconnectAttempts },
      })
      return
    }

    const delay = baseReconnectDelay * 2 ** reconnectAttempts

    reconnectTimeout = setTimeout(async () => {
      reconnectAttempts++

      try {
        await createConnection()
      } catch (error) {
        logger.error({
          msg: 'Reconnection attempt failed',
          event: 'rabbitmq_reconnect_failed',
          metadata: {
            attempt: reconnectAttempts,
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }, delay)

    logger.info({
      msg: 'Scheduling RabbitMQ reconnection',
      event: 'rabbitmq_reconnect_scheduled',
      metadata: {
        attempt: reconnectAttempts + 1,
        delay,
      },
    })
  }

  // Get or create connection
  const getConnection = async (): Promise<{
    connection: amqp.ChannelModel
    channel: amqp.Channel
  }> => {
    if (state !== 'connected' || !connection || !channel) {
      return createConnection()
    }

    return { connection, channel }
  }

  // Initialize queues
  const initializeQueues = async (): Promise<void> => {
    const { channel } = await getConnection()

    // Assert main queue
    await channel.assertQueue(QUEUE_CONFIG.ENRICHMENT_QUEUE, {
      durable: true,
      arguments: {
        'x-message-ttl': QUEUE_CONFIG.MESSAGE_TTL,
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': QUEUE_CONFIG.ENRICHMENT_DLQ,
      },
    })

    // Assert dead letter queue
    await channel.assertQueue(QUEUE_CONFIG.ENRICHMENT_DLQ, {
      durable: true,
      arguments: {
        'x-message-ttl': DELETED_TTL,
      },
    })

    logger.info({
      msg: 'RabbitMQ queues initialized',
      event: 'rabbitmq_queues_initialized',
      metadata: {
        mainQueue: QUEUE_CONFIG.ENRICHMENT_QUEUE,
        dlq: QUEUE_CONFIG.ENRICHMENT_DLQ,
      },
    })
  }

  // Generate unique message ID
  const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Handle individual message processing
  const handleMessage = async <T>(
    channel: amqp.Channel,
    message: amqp.Message,
    processor: JobProcessor<T>,
  ): Promise<void> => {
    const messageId = message.properties.messageId || 'unknown'

    try {
      const queueMessage: QueueMessage<T> = JSON.parse(
        message.content.toString(),
      )

      logger.info({
        msg: 'Processing RabbitMQ message',
        event: 'rabbitmq_message_processing_start',
        metadata: {
          messageId,
          queueMessageId: queueMessage.id,
          retryCount: queueMessage.retryCount,
        },
      })

      await processor(queueMessage.data, queueMessage.id)
      channel.ack(message)

      logger.info({
        msg: 'RabbitMQ message processed successfully',
        event: 'rabbitmq_message_processed',
        metadata: { messageId },
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      logger.error({
        msg: 'RabbitMQ message processing failed',
        event: 'rabbitmq_message_processing_failed',
        metadata: { messageId, error: errorMessage },
      })

      const queueMessage: QueueMessage<T> = JSON.parse(
        message.content.toString(),
      )

      if (queueMessage.retryCount < QUEUE_CONFIG.MAX_RETRIES) {
        channel.nack(message, false, true)

        logger.info({
          msg: 'RabbitMQ message requeued for retry',
          event: 'rabbitmq_message_requeued',
          metadata: {
            messageId,
            retryCount: queueMessage.retryCount + 1,
            maxRetries: QUEUE_CONFIG.MAX_RETRIES,
          },
        })
      } else {
        channel.nack(message, false, false)

        logger.warn({
          msg: 'RabbitMQ message sent to dead letter queue',
          event: 'rabbitmq_message_dlq',
          metadata: {
            messageId,
            retryCount: queueMessage.retryCount,
            maxRetries: QUEUE_CONFIG.MAX_RETRIES,
          },
        })
      }
    }
  }

  /**
   * Adds a job to the specified queue
   * @param queueName - Name of the queue
   * @param data - Data to be processed
   * @param options - Queue options (priority, retryCount, delay)
   * @returns Message ID of the added job
   */
  const addJob = async <T>(
    queueName: string,
    data: T,
    options: QueueOptions = {},
  ): Promise<string> => {
    await initializeQueues()

    const { channel } = await getConnection()
    const messageId = generateMessageId()

    const message: QueueMessage<T> = {
      id: messageId,
      data,
      timestamp: Date.now(),
      retryCount: options.retryCount || 0,
    }

    const buffer = Buffer.from(JSON.stringify(message))
    const publishOptions = {
      persistent: true,
      messageId,
      priority: options.priority,
    }

    if (options.priority) {
      publishOptions.priority = options.priority
    }

    if (options.delay) {
      logger.warn({
        msg: 'Message delay not implemented yet',
        event: 'rabbitmq_delay_not_implemented',
        metadata: { delay: options.delay },
      })
    }

    await channel.sendToQueue(queueName, buffer, publishOptions)

    logger.info({
      msg: 'Job added to RabbitMQ queue',
      event: 'rabbitmq_job_added',
      metadata: {
        queueName,
        messageId,
        dataSize: buffer.length,
        priority: options.priority,
      },
    })

    return messageId
  }

  /**
   * Processes jobs from the specified queue
   * @param queueName - Name of the queue to process
   * @param processor - Function to process each job
   * @param options - Processing options (concurrency, prefetchCount)
   */
  const processJobs = async <T>(
    queueName: string,
    processor: JobProcessor<T>,
    options: ProcessOptions = {},
  ): Promise<void> => {
    await initializeQueues()

    const { channel } = await getConnection()
    const concurrency = options.concurrency || QUEUE_CONFIG.CONCURRENT_JOBS
    const prefetchCount = options.prefetchCount || concurrency

    await channel.prefetch(prefetchCount)
    processors.set(queueName, processor as JobProcessor<unknown>)

    await channel.consume(queueName, async (message) => {
      if (!message) return
      await handleMessage(channel, message, processor)
    })

    activeChannels.add(channel)

    logger.info({
      msg: 'Started processing jobs from RabbitMQ queue',
      event: 'rabbitmq_job_processing_started',
      metadata: {
        queueName,
        concurrency,
        prefetchCount,
      },
    })
  }

  /**
   * Gets statistics for the specified queue
   * @param queueName - Name of the queue
   * @returns Queue statistics
   */
  const getQueueStats = async (queueName: string): Promise<QueueStats> => {
    const { channel } = await getConnection()
    const queueInfo = await channel.checkQueue(queueName)

    return {
      messageCount: queueInfo.messageCount,
      consumerCount: queueInfo.consumerCount,
    }
  }

  /**
   * Gets comprehensive health information for all queues
   * @returns Queue health information
   */
  const getQueueHealth = async (): Promise<QueueHealth> => {
    try {
      const mainQueueStats = await getQueueStats(QUEUE_CONFIG.ENRICHMENT_QUEUE)
      const dlqStats = await getQueueStats(QUEUE_CONFIG.ENRICHMENT_DLQ)

      return {
        isConnected: state === 'connected',
        mainQueue: mainQueueStats,
        deadLetterQueue: dlqStats,
      }
    } catch (error) {
      logger.error({
        msg: 'Failed to get queue health',
        event: 'queue_health_error',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      })

      return {
        isConnected: false,
        mainQueue: { messageCount: 0, consumerCount: 0 },
        deadLetterQueue: { messageCount: 0, consumerCount: 0 },
      }
    }
  }

  /**
   * Purges all messages from the specified queue
   * @param queueName - Name of the queue to purge
   */
  const purgeQueue = async (queueName: string): Promise<void> => {
    const { channel } = await getConnection()
    await channel.purgeQueue(queueName)

    logger.warn({
      msg: 'RabbitMQ queue purged',
      event: 'rabbitmq_queue_purged',
      metadata: { queueName },
    })
  }

  /**
   * Gracefully shuts down the RabbitMQ client
   */
  const shutdown = async (): Promise<void> => {
    logger.info({
      msg: 'Shutting down RabbitMQ client',
      event: 'rabbitmq_client_shutdown',
    })

    isShuttingDown = true

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    // Cancel all consumers
    for (const activeChannel of activeChannels) {
      try {
        await activeChannel.cancel('')
      } catch (error) {
        logger.error({
          msg: 'Error canceling RabbitMQ consumers',
          event: 'rabbitmq_consumer_cancel_error',
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }

    activeChannels.clear()
    processors.clear()

    if (channel) {
      try {
        await channel.close()
      } catch (error) {
        logger.error({
          msg: 'Error closing RabbitMQ channel',
          event: 'rabbitmq_channel_close_error',
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }

    if (connection) {
      try {
        await connection.close()
      } catch (error) {
        logger.error({
          msg: 'Error closing RabbitMQ connection',
          event: 'rabbitmq_connection_close_error',
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }

    connection = null
    channel = null
    state = 'disconnected'

    logger.info({
      msg: 'RabbitMQ client shut down successfully',
      event: 'rabbitmq_client_shutdown_complete',
    })
  }

  return {
    // Connection management
    getConnection,
    shutdown,

    // Queue operations
    addJob,
    processJobs,
    getQueueStats,
    getQueueHealth,
    purgeQueue,

    // Utility methods
    get state() {
      return state
    },
    get isConnected() {
      return state === 'connected' && !!connection && !!channel
    },
  }
}

// Create singleton instance
export const rabbitMQClient = createRabbitMQClient()
