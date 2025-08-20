import { logger } from '@ritchy/logger'
import { Worker } from 'bullmq'
import { MILLION_VERIFIER_CONFIG } from '../../../../config/million_verifier'
import { MillionVerifierResponseSchema } from '../../../../external/million_verifier'
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
    const response = await fetch(
      `https://api.millionverifier.com/api/v3/?api=${MILLION_VERIFIER_CONFIG.API_KEY}&email=${email}&timeout=10`,
    )
    const data = await response.json()

    const validatedData = MillionVerifierResponseSchema.parse(data)

    logger.info({
      msg: '[Million Verifier] Email verified',
      event: 'email_verified',
      metadata: { email: job.data.email, data: validatedData },
    })
    return validatedData
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
