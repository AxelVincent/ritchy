import { Queue } from 'bullmq'
import { bullmqRedisOptions } from '../../../config'

export interface EnrichmentBatchJobData {
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

export const enrichmentBatchQueue = new Queue<EnrichmentBatchJobData>(
  'enrichment-batch',
  {
    connection: bullmqRedisOptions,
    defaultJobOptions: {
      attempts: 1,
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
  },
)
