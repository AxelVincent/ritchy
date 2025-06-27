import { logger } from '@ritchy/logger'
import { QUEUE_CONFIG } from '../../config/rabbitmq'
import {
  initialize_enrichment_queue,
  shutdown_enrichment_queue,
} from '../../services/enrichment/queue/batch_enrichment_queue'
import { rabbitMQClient } from './rabbitmq'

type ServiceStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error'

type RabbitMQService = {
  start: () => Promise<void>
  stop: () => Promise<void>
  getStatus: () => ServiceStatus
  getHealth: () => Promise<{
    isHealthy: boolean
    status: ServiceStatus
    queues: {
      mainQueue: { messageCount: number; consumerCount: number }
      deadLetterQueue: { messageCount: number; consumerCount: number }
    }
    connection: { isConnected: boolean; state: string }
  }>
}

// Service state management
let serviceStatus: ServiceStatus = 'stopped'
let isInitialized = false

/**
 * Initialize all RabbitMQ consumers and services
 */
const initializeServices = async (): Promise<void> => {
  if (isInitialized) {
    logger.warn({
      msg: 'RabbitMQ services already initialized',
      event: 'rabbitmq_services_already_initialized',
    })
    return
  }

  try {
    logger.info({
      msg: 'Initializing RabbitMQ services',
      event: 'rabbitmq_services_initialization_start',
    })

    // Initialize enrichment queue consumer
    await initialize_enrichment_queue()

    isInitialized = true

    logger.info({
      msg: 'RabbitMQ services initialized successfully',
      event: 'rabbitmq_services_initialized',
      metadata: {
        enrichmentQueue: QUEUE_CONFIG.ENRICHMENT_QUEUE,
        concurrentItems: QUEUE_CONFIG.CONCURRENT_ITEMS,
        concurrentJobs: QUEUE_CONFIG.CONCURRENT_JOBS,
      },
    })
  } catch (error) {
    serviceStatus = 'error'
    isInitialized = false

    logger.error({
      msg: 'Failed to initialize RabbitMQ services',
      event: 'rabbitmq_services_initialization_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    throw error
  }
}

/**
 * Shutdown all RabbitMQ consumers and services
 */
const shutdownServices = async (): Promise<void> => {
  if (!isInitialized) {
    logger.warn({
      msg: 'RabbitMQ services not initialized',
      event: 'rabbitmq_services_not_initialized',
    })
    return
  }

  try {
    logger.info({
      msg: 'Shutting down RabbitMQ services',
      event: 'rabbitmq_services_shutdown_start',
    })

    // Shutdown enrichment queue
    await shutdown_enrichment_queue()

    isInitialized = false

    logger.info({
      msg: 'RabbitMQ services shut down successfully',
      event: 'rabbitmq_services_shutdown_complete',
    })
  } catch (error) {
    logger.error({
      msg: 'Error shutting down RabbitMQ services',
      event: 'rabbitmq_services_shutdown_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    // Don't throw during shutdown to allow other cleanup to proceed
  }
}

/**
 * Start the RabbitMQ service
 */
const start = async (): Promise<void> => {
  if (serviceStatus === 'running' || serviceStatus === 'starting') {
    logger.warn({
      msg: 'RabbitMQ service is already running or starting',
      event: 'rabbitmq_service_already_running',
      metadata: { currentStatus: serviceStatus },
    })
    return
  }

  serviceStatus = 'starting'

  try {
    await initializeServices()
    serviceStatus = 'running'

    logger.info({
      msg: 'RabbitMQ service started successfully',
      event: 'rabbitmq_service_started',
    })
  } catch (error) {
    serviceStatus = 'error'

    logger.error({
      msg: 'Failed to start RabbitMQ service',
      event: 'rabbitmq_service_start_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    throw error
  }
}

/**
 * Stop the RabbitMQ service
 */
const stop = async (): Promise<void> => {
  if (serviceStatus === 'stopped' || serviceStatus === 'stopping') {
    logger.warn({
      msg: 'RabbitMQ service is already stopped or stopping',
      event: 'rabbitmq_service_already_stopped',
      metadata: { currentStatus: serviceStatus },
    })
    return
  }

  serviceStatus = 'stopping'

  try {
    await shutdownServices()
    serviceStatus = 'stopped'

    logger.info({
      msg: 'RabbitMQ service stopped successfully',
      event: 'rabbitmq_service_stopped',
    })
  } catch (error) {
    serviceStatus = 'error'

    logger.error({
      msg: 'Error stopping RabbitMQ service',
      event: 'rabbitmq_service_stop_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    // Don't throw during shutdown
  }
}

/**
 * Get current service status
 */
const getStatus = (): ServiceStatus => {
  return serviceStatus
}

/**
 * Get comprehensive health information
 */
const getHealth = async (): Promise<{
  isHealthy: boolean
  status: ServiceStatus
  queues: {
    mainQueue: { messageCount: number; consumerCount: number }
    deadLetterQueue: { messageCount: number; consumerCount: number }
  }
  connection: { isConnected: boolean; state: string }
}> => {
  try {
    const queueHealth = await rabbitMQClient.getQueueHealth()

    const isHealthy =
      serviceStatus === 'running' && queueHealth.isConnected && isInitialized

    return {
      isHealthy,
      status: serviceStatus,
      queues: {
        mainQueue: queueHealth.mainQueue,
        deadLetterQueue: queueHealth.deadLetterQueue,
      },
      connection: {
        isConnected: queueHealth.isConnected,
        state: rabbitMQClient.state,
      },
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to get RabbitMQ service health',
      event: 'rabbitmq_service_health_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return {
      isHealthy: false,
      status: serviceStatus,
      queues: {
        mainQueue: { messageCount: 0, consumerCount: 0 },
        deadLetterQueue: { messageCount: 0, consumerCount: 0 },
      },
      connection: {
        isConnected: false,
        state: 'error',
      },
    }
  }
}

/**
 * Create and export the RabbitMQ service
 */
const createRabbitMQService = (): RabbitMQService => ({
  start,
  stop,
  getStatus,
  getHealth,
})

// Export singleton instance
export const rabbitMQService = createRabbitMQService()
