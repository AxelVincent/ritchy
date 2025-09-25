import { Queue } from 'bullmq'
import { bullmqRedisOptions } from '../../../config'

export interface EnrichmentBatchJobData {
  enrichments: Array<{ userPlaceId: string }>
  totalCount: number
  // Add these optional properties for tracking
  processedCount?: number
  successCount?: number
  errorCount?: number
  successRate?: number
  errors?: Array<{ userPlaceId: string; error: string }>
  successes?: Array<{ userPlaceId: string }>
}
export const queueName = 'enrichment-batch'
export const enrichmentBatchQueue = new Queue<EnrichmentBatchJobData>(
  queueName,
  {
    connection: bullmqRedisOptions,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 24 * 3600,
        count: 1000,
      },
    },
  },
)
