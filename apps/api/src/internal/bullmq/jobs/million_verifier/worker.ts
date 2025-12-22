import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import { MILLION_VERIFIER_CONFIG } from '../../../../config/million_verifier'
import { MillionVerifierResponseSchema } from '../../../../external/million_verifier'
import {
  createSimpleDurationTimer,
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../../../metrics/collectors'
import { setupQueueMetrics } from '../../../../metrics/queue'
import { bullmqRedisOptions } from '../../config'

const worker = new Worker(
  'million-verifier',
  async (job) => {
    logger.info({
      msg: '[Million Verifier] Verifying email',
      event: 'verifying_email',
      metadata: { email: job.data.email },
    })
    const { email } = job.data
    const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
    let statusCode = '500'

    try {
      const response = await fetch(
        `https://api.millionverifier.com/api/v3/?api=${MILLION_VERIFIER_CONFIG.API_KEY}&email=${email}&timeout=10`,
      )
      statusCode = response.status.toString()
      const data = await response.json()

      const validatedData = MillionVerifierResponseSchema.parse(data)

      metricsTimer.stop({
        service: 'million_verifier',
        endpoint: 'email_verification',
      })
      externalApiRequestsCounter.inc({
        service: 'million_verifier',
        endpoint: 'email_verification',
        status_code: statusCode,
      })

      logger.info({
        msg: '[Million Verifier] Email verified',
        event: 'email_verified',
        metadata: { email: job.data.email, data: validatedData },
      })
      return validatedData
    } catch (error) {
      metricsTimer.stop({
        service: 'million_verifier',
        endpoint: 'email_verification',
      })
      externalApiRequestsCounter.inc({
        service: 'million_verifier',
        endpoint: 'email_verification',
        status_code: statusCode,
      })
      throw error
    }
  },
  {
    connection: bullmqRedisOptions,
    concurrency: 50,
    limiter: {
      max: 400,
      duration: 1000,
    },
  },
)

setupQueueMetrics(worker, 'million_verifier', 'email_verification')

worker.on('completed', (job) => {
  logger.info({
    msg: 'Million Verifier job completed',
    event: 'million_verifier_success',
    metadata: { jobId: job.id },
  })
})

worker.on('failed', (job, err) => {
  logger.error({
    msg: 'Million Verifier job failed',
    event: 'million_verifier_error',
    metadata: { jobId: job?.id, error: err.message },
  })
})
