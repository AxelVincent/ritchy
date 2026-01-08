import { Queue } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

export const queueName = 'enrichment-company'

export interface CompanyEnrichmentJobData {
  userPlaceId: string
  enrichmentId: string
  placeId: string
  userId: string
  /** Optional AI search ID - if present, filters will be evaluated after enrichment */
  aiSearchId?: string
}

export const companyEnrichmentQueue = new Queue<CompanyEnrichmentJobData>(
  queueName,
  {
    connection: bullmqRedisOptions,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: {
        age: 300, // 5 minutes
        count: 20, // Reduced from 100 to limit memory usage
      },
      removeOnFail: {
        age: 3600, // 1 hour
        count: 20, // Reduced from 100 to limit memory usage
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

/**
 * Batch enqueue multiple company enrichment jobs using BullMQ's addBulk.
 * This is an atomic operation - all jobs are added or none.
 *
 * @param jobs - Array of job data to enqueue
 * @returns Array of job IDs for the enqueued jobs
 */
export const enqueueBulkCompanyEnrichment = async (
  jobs: CompanyEnrichmentJobData[],
): Promise<string[]> => {
  if (jobs.length === 0) return []

  const timestamp = Date.now()
  const bulkJobs = jobs.map((data, index) => ({
    name: queueName,
    data,
    opts: {
      jobId: `company-${data.userPlaceId}-${timestamp}-${index}`,
    },
  }))

  const addedJobs = await companyEnrichmentQueue.addBulk(bulkJobs)
  return addedJobs.map((job) => job.id ?? '')
}
