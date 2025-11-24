import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import { WHOIS_CONFIG } from '../../../../config/whois'
import { performWhoisLookup } from '../../../../external/whois/whois_api'
import { setupQueueMetrics } from '../../../../metrics/queue'
import { bullmqRedisOptions } from '../../config'
import { queueName } from './queue'

const whoisWorker = new Worker(
  queueName,
  async (job) => {
    const { domain, timeoutMs } = job.data
    const whois = await performWhoisLookup(domain, timeoutMs)
    return whois
  },
  {
    connection: bullmqRedisOptions,
    concurrency: 50,
    limiter: {
      max: WHOIS_CONFIG.RATE_LIMIT.BURST_CAPACITY,
      duration: 1000,
    },
  },
)

setupQueueMetrics(whoisWorker, 'whois', 'domain_lookup')

whoisWorker.on('completed', (job) => {
  logger.info({
    msg: 'Whois job completed',
    event: 'whois_job_completed',
    metadata: { jobId: job.id },
  })
})

whoisWorker.on('failed', (job, err) => {
  logger.error({
    msg: 'Whois job failed',
    event: 'whois_job_failed',
    metadata: { jobId: job?.id, error: err.message },
  })
})
