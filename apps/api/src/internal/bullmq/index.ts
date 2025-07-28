import { REDIS_CONFIG } from '../../config/redis'

export const bullmqRedisOptions = {
  host: REDIS_CONFIG.HOST,
  port: REDIS_CONFIG.PORT,
  password: REDIS_CONFIG.PASSWORD,
  username: REDIS_CONFIG.USER,
}
