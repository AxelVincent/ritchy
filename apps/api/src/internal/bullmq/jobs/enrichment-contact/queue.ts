import { Queue } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

export const queueName = 'enrichment-contact'

export interface ContactEnrichmentJobData {
  contactId: string
  userPlaceId: string
  userId: string
}

export const contactEnrichmentQueue = new Queue<ContactEnrichmentJobData>(
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

export const enqueueContactEnrichment = async (
  data: ContactEnrichmentJobData,
): Promise<string> => {
  const job = await contactEnrichmentQueue.add(queueName, data, {
    jobId: `contact-${data.contactId}-${Date.now()}`,
  })
  return job.id ?? ''
}
