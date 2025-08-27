import type { DomainRegistration } from '@ritchy/types'
import { Queue, QueueEvents } from 'bullmq'
import { bullmqRedisOptions } from '../../config'

export const queueName = 'whois'
export const whoisQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: 'exponential',
      delay: 1000,
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
