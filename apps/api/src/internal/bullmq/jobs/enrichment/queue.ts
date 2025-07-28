import { Queue } from 'bullmq'
import { bullmqRedisOptions } from '../..'

export interface EnrichmentJobData {
  enrichments: Array<{
    userPlaceId: string
  }>
  totalCount: number
  processedCount: number
  errors: Array<{
    userPlaceId: string
    error: string
  }>
}

export const enrichmentQueue = new Queue<EnrichmentJobData>('enrichment', {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 300,
      count: 1000,
    },
    removeOnFail: false,
  },
})
