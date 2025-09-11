import type { DomainRegistration } from '@ritchy/types'
import { Queue, QueueEvents } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

export const queueName = 'whois'
export const whoisQueue = new Queue(queueName, {
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
