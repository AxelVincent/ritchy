import { z } from 'zod'
import { REDIS_CONFIG } from '../../config/redis'

export const bullmqRedisOptions = {
  url: `redis://${REDIS_CONFIG.USER}:${REDIS_CONFIG.PASSWORD}@${REDIS_CONFIG.HOST}:${REDIS_CONFIG.PORT}?family=0`,
}

const envSchema = z.object({
  SCRAPER_CONCURRENCY: z.string(),
  BRIGHTDATA_CONCURRENCY: z.string(),
  ENRICHMENT_UNIT_CONCURRENCY: z.string(),
})

const env = envSchema.parse(process.env)

export const workerConfig = {
  scraper: {
    concurrency: Number.parseInt(env.SCRAPER_CONCURRENCY),
  },
  brightdata: {
    concurrency: Number.parseInt(env.BRIGHTDATA_CONCURRENCY),
  },
  enrichment_unit: {
    concurrency: Number.parseInt(env.ENRICHMENT_UNIT_CONCURRENCY),
  },
}
