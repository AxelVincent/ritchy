import type { DomainRegistration } from '@ritchy/types'
import { Queue, QueueEvents } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

export const queueName = 'whois'
export const whoisQueue = new Queue(queueName, {
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
})

const whoisQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueWhoisJob = async (
  domain: string,
  timeoutMs = 10000,
): Promise<DomainRegistration | null> => {
  const job = await whoisQueue.add('whois', { domain, timeoutMs })
  return await job.waitUntilFinished(whoisQueueEvents)
}
