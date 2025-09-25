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
  pappers: {
    concurrency: 100,
    lockDuration: 60000,
    renewalInterval: 30000,
    stalledInterval: 30000,
    maxStalledCount: 2,
  },
  scraper: {
    concurrency: Number.parseInt(env.SCRAPER_CONCURRENCY),
    lockDuration: 360000,
    renewalInterval: 120000,
    stalledInterval: 60000,
    maxStalledCount: 2,
  },
  brightdata: {
    concurrency: Number.parseInt(env.BRIGHTDATA_CONCURRENCY),
    lockDuration: 90000,
    renewalInterval: 30000,
    stalledInterval: 30000,
    maxStalledCount: 2,
  },
  firecrawl: {
    concurrency: 50,
    lockDuration: 60000,
    renewalInterval: 30000,
    stalledInterval: 30000,
    maxStalledCount: 2,
  },
  enrichment_unit: {
    concurrency: Number.parseInt(env.ENRICHMENT_UNIT_CONCURRENCY),
    lockDuration: 600000,
    renewalInterval: 300000,
    stalledInterval: 180000,
    maxStalledCount: 2,
  },
  enrichment_batch: {
    concurrency: 10,
    lockDuration: 300000,
    renewalInterval: 120000,
    stalledInterval: 90000,
    maxStalledCount: 2,
  },
}
