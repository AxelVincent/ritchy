import { REDIS_CONFIG } from '../../config/redis'

export const bullmqRedisOptions = {
  url: `redis://${REDIS_CONFIG.USER}:${REDIS_CONFIG.PASSWORD}@${REDIS_CONFIG.HOST}:${REDIS_CONFIG.PORT}?family=0`,
}
