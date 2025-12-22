import { Queue } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

export const queueName = 'enrichment-company'

export interface CompanyEnrichmentJobData {
  userPlaceId: string
  enrichmentId: string
  placeId: string
  userId: string
}

export const companyEnrichmentQueue = new Queue<CompanyEnrichmentJobData>(
  queueName,
  {
    connection: bullmqRedisOptions,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: {
        age: 300, // 5 minutes
        count: 100,
      },
      removeOnFail: {
        age: 3600, // 1 hour
        count: 100,
      },
    },
  },
)

export const enqueueCompanyEnrichment = async (
  data: CompanyEnrichmentJobData,
): Promise<string> => {
  const job = await companyEnrichmentQueue.add(queueName, data, {
    jobId: `company-${data.userPlaceId}-${Date.now()}`,
  })
  return job.id ?? ''
}
