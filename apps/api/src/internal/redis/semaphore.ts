import { logger } from '@ritchy/logger'
import { redisClient } from './redis'

const SEMAPHORE_PREFIX = 'semaphore'
const DEFAULT_TTL_SECONDS = 300

/**
 * Lua script for atomic semaphore acquisition
 * Returns the current count if acquired, -1 if full
 */
const ACQUIRE_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[1])
if current <= tonumber(ARGV[2]) then
  return current
end
redis.call('DECR', KEYS[1])
return -1
`

export type AcquireResult = {
  acquired: boolean
  current: number
  max: number
  release: () => Promise<void>
}

export type SemaphoreStatus = {
  current: number
  max: number
  available: number
}

export type Semaphore = {
  tryAcquire: () => Promise<AcquireResult>
  getStatus: () => Promise<SemaphoreStatus>
  reset: () => Promise<void>
  name: string
  maxConcurrent: number
}

/**
 * Creates a distributed semaphore backed by Redis
 *
 * @example
 * ```ts
 * const semaphore = createSemaphore('my-resource', 10)
 *
 * const { acquired, release } = await semaphore.tryAcquire()
 * if (acquired) {
 *   try {
 *     await doWork()
 *   } finally {
 *     await release()
 *   }
 * }
 * ```
 */
export const createSemaphore = (
  name: string,
  maxConcurrent: number,
): Semaphore => {
  const key = `${SEMAPHORE_PREFIX}:${name}`
  const redis = redisClient.redis

  const tryAcquire = async (): Promise<AcquireResult> => {
    let released = false

    const release = async () => {
      if (released) return
      released = true

      const newCount = await redis.decr(key)
      if (newCount < 0) {
        await redis.set(key, '0')
      }

      logger.debug({
        msg: `[Semaphore] Released ${name}`,
        event: 'semaphore_release',
        metadata: { name, current: Math.max(0, newCount), max: maxConcurrent },
      })
    }

    const noopRelease = async () => {}

    // Atomic acquire using Lua script
    const result = await redis.eval(
      ACQUIRE_SCRIPT,
      1,
      key,
      DEFAULT_TTL_SECONDS.toString(),
      maxConcurrent.toString(),
    )

    const current = Number(result)

    if (current > 0) {
      logger.debug({
        msg: `[Semaphore] Acquired ${name}`,
        event: 'semaphore_acquire',
        metadata: { name, current, max: maxConcurrent },
      })

      return { acquired: true, current, max: maxConcurrent, release }
    }

    // -1 means full
    const status = await getStatus()

    logger.debug({
      msg: `[Semaphore] Full ${name}`,
      event: 'semaphore_full',
      metadata: { name, current: status.current, max: maxConcurrent },
    })

    return {
      acquired: false,
      current: status.current,
      max: maxConcurrent,
      release: noopRelease,
    }
  }

  const getStatus = async (): Promise<SemaphoreStatus> => {
    const value = await redis.get(key)
    const current = value ? Math.max(0, Number.parseInt(value, 10)) : 0
    return {
      current,
      max: maxConcurrent,
      available: Math.max(0, maxConcurrent - current),
    }
  }

  const reset = async (): Promise<void> => {
    await redis.del(key)
    logger.info({
      msg: `[Semaphore] Reset ${name}`,
      event: 'semaphore_reset',
      metadata: { name },
    })
  }

  return { tryAcquire, getStatus, reset, name, maxConcurrent }
}
