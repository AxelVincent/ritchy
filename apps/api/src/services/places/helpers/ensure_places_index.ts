import { logger } from '@ritchy/logger'
import { redisClient } from '../../../external/redis/redis'

const indexSchema = ['$.data.id', 'AS', 'id', 'TAG']
const nameSchema = ['$.data.displayName.text', 'AS', 'name', 'TEXT', 'SORTABLE']

/**
 * Ensure RediSearch index exists for places with comprehensive field indexing
 */
export const ensurePlacesIndex = async (): Promise<void> => {
  try {
    // Check if index exists first
    await redisClient.redis.call('FT.INFO', 'places_idx')
    logger.info({
      msg: 'RediSearch index already exists',
      event: 'places_index_exists'
    })
  } catch (_) {
    // Create index only if it doesn't exist
    try {
      const response = await redisClient.redis.call(
        'FT.CREATE',
        'places_idx',
        'ON',
        'JSON',
        'PREFIX',
        '1',
        'place:',
        'SCHEMA',
        ...indexSchema,
        ...nameSchema
      )
      logger.info({
        msg: 'Redis command response',
        event: 'places_index_create_attempt',
        metadata: { response }
      })
      logger.info({
        msg: 'Created new RediSearch index',
        event: 'places_index_created'
      })
    } catch (createError) {
      logger.error({
        msg: 'Failed to create RediSearch index',
        event: 'places_index_create_error',
        metadata: {
          error: createError,
          command: [
            'FT.CREATE',
            'places_idx',
            'ON',
            'JSON',
            'PREFIX',
            '1',
            'place:',
            'SCHEMA',
            '$.data.id',
            'AS',
            'id',
            'TAG'
          ]
        }
      })
      throw createError
    }
  }
}
