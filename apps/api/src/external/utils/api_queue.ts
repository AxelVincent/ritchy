/**
 * Represents a queued API request with priority and retry functionality
 */
type QueuedRequest<T> = {
  execute: () => Promise<T>
  priority?: number
  retries?: number
}

/**
 * Configuration options for the API queue
 */
type QueueOptions = {
  /** Maximum number of retry attempts for failed requests (default: 3) */
  maxRetries?: number
  /** Default priority for requests without specified priority (default: 0) */
  defaultPriority?: number
  /** Error handler for failed requests (default: console.error) */
  onError?: (error: Error) => void
}

/**
 * Creates a rate-limited API queue with priority and retry functionality
 *
 * @param rateLimiter - Token bucket rate limiter instance
 * @param options - Queue configuration options
 *
 * @example
 * ```typescript
 * // Create a rate limiter (50 requests per second)
 * const rateLimiter = createTokenBucket(50, 50)
 *
 * // Create an API queue with custom options
 * const apiQueue = createApiQueue(rateLimiter, {
 *   maxRetries: 3,
 *   defaultPriority: 0,
 *   onError: (error) => {
 *     console.error('Queue error:', error)
 *     // Add your error reporting here
 *   }
 * })
 *
 * // Example: Fetch data with different priorities
 * const fetchUserData = async (userId: string) => {
 *   return apiQueue.addToQueue(
 *     async () => {
 *       const response = await fetch(`/api/users/${userId}`)
 *       return response.json()
 *     },
 *     2 // High priority
 *   )
 * }
 *
 * const fetchProductData = async (productId: string) => {
 *   return apiQueue.addToQueue(
 *     async () => {
 *       const response = await fetch(`/api/products/${productId}`)
 *       return response.json()
 *     },
 *     1 // Normal priority
 *   )
 * }
 *
 * // Process multiple requests
 * const processData = async () => {
 *   try {
 *     const [user, product] = await Promise.all([
 *       fetchUserData('123'),
 *       fetchProductData('456')
 *     ])
 *
 *     console.log('Queue length:', apiQueue.getQueueLength())
 *     return { user, product }
 *   } catch (error) {
 *     console.error('Failed to process data:', error)
 *     throw error
 *   }
 * }
 * ```
 */
export const createApiQueue = (
  rateLimiter: {
    getToken: (options?: { throwOnLimit?: boolean }) => Promise<void>
    capacity?: number
  },
  options: QueueOptions = {},
) => {
  const {
    maxRetries = 3,
    defaultPriority = 0,
    onError = console.error,
  } = options

  const queue: QueuedRequest<unknown>[] = []
  let isProcessing = false

  const addToQueue = async <T>(
    request: () => Promise<T>,
    priority = defaultPriority,
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      queue.push({
        execute: async () => {
          try {
            await rateLimiter.getToken()
            const result = await request()
            resolve(result)
            return result
          } catch (error) {
            reject(error)
            throw error
          }
        },
        priority,
        retries: 0,
      })

      // Sort queue by priority (higher numbers first)
      queue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

      processQueue().catch(onError)
    })
  }

  const processQueue = async (): Promise<void> => {
    if (isProcessing || queue.length === 0) return

    isProcessing = true

    // Process multiple requests concurrently up to the burst capacity
    const concurrentRequests = Math.min(
      queue.length,
      rateLimiter.capacity || 50,
    )
    const requestsToProcess = queue.splice(0, concurrentRequests)

    try {
      await Promise.allSettled(
        requestsToProcess.map(async (request) => {
          try {
            await rateLimiter.getToken()
            await request.execute()
          } catch (error) {
            const currentRetries = request.retries ?? 0

            if (currentRetries < maxRetries) {
              // Re-queue for retry
              const updatedRequest = {
                ...request,
                retries: currentRetries + 1,
              }
              queue.push(updatedRequest)
            } else {
              onError(error as Error)
            }
          }
        }),
      )
    } finally {
      isProcessing = false

      // Continue processing if there are more items in the queue
      if (queue.length > 0) {
        processQueue().catch(onError)
      }
    }
  }

  const getQueueLength = () => queue.length

  return {
    addToQueue,
    getQueueLength,
  }
}
