import { logger } from '@ritchy/logger'
import { startDurationTimer } from '@ritchy/metrics'
import { EmailQualityEnum } from '@ritchy/types'
import { z } from 'zod'
import { enqueueMillionVerifierJob } from '../../internal/bullmq/jobs/million_verifier/queue'
import { redisClient } from '../../internal/redis/redis'
import {
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'
import { sendSlackNotification } from '../slack/slack'

export const MillionVerifierResponseSchema = z.object({
  email: z.string().email(),
  quality: EmailQualityEnum,
  result: z.enum([
    'ok',
    'catch_all',
    'unknown',
    'error',
    'disposable',
    'invalid',
  ]),
  resultcode: z.number().int().min(1).max(6),
  subresult: z.enum([
    'unknown',
    'ok',
    'internal_error',
    'invalid_syntax',
    'no_local_ip_available',
    'dns_server_failed',
    'dns_no_mx',
    'dns_no_a',
    'could_not_connect',
    'no_code_in_banner',
    'invalid_banner_code',
    'no_code_in_ehlo_response',
    'no_code_in_helo_response',
    'no_code_in_mail_from_response',
    'no_code_in_rcpt_to_response',
    'ip_blocked',
    'no_mailbox',
    'mailbox_disabled',
    'mailbox_full',
    'greylisted',
    'connection_lost',
    'connection_timeout',
    'connection_refused',
    'connection_reset_by_peer',
    'connection_no_route_to_host',
    'host_not_accept_incoming_mail',
    'mail_service_unavailable',
    'bad_domain',
    'dns_error',
    'anti_spam_system',
    'dns_no_domain',
    'dns_refused',
    'timeout',
  ]),
  free: z.boolean(),
  role: z.boolean(),
  didyoumean: z.string().nullable(),
  credits: z.number().int().positive(),
  executiontime: z.number().int(),
  error: z.string(),
  livemode: z.boolean(),
})

export type MillionVerifierResponse = z.infer<
  typeof MillionVerifierResponseSchema
>

export const verifyWithMillionVerifier = async (
  email: string,
): Promise<MillionVerifierResponse> => {
  const metricsTimer = startDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '500'

  try {
    const cachedResult = await redisClient.get<MillionVerifierResponse>(
      `million_verifier:${email}`,
    )
    if (cachedResult) {
      httpStatusCode = '200'
      metricsTimer.stop({
        service: 'million_verifier',
        endpoint: 'email_verification',
      })
      externalApiRequestsCounter.inc({
        service: 'million_verifier',
        endpoint: 'email_verification',
        status_code: httpStatusCode,
      })
      return cachedResult.data
    }

    const result = await enqueueMillionVerifierJob(email)
    await redisClient.set(`million_verifier:${email}`, result, {
      ttl: 60 * 60 * 24 * 7, // 7 days
    })

    logger.debug({
      msg: '[Million Verifier] Email verified with result',
      event: 'email_verified_with_result',
      metadata: { email, result: result },
    })

    if (!result) {
      httpStatusCode = '500'
      metricsTimer.stop({
        service: 'million_verifier',
        endpoint: 'email_verification',
      })
      externalApiRequestsCounter.inc({
        service: 'million_verifier',
        endpoint: 'email_verification',
        status_code: httpStatusCode,
      })
      throw new Error('Failed to verify email')
    }

    if (result.credits < 500) {
      sendSlackNotification({
        channel: 'tech_monitoring',
        text: `[Million Verifier] Email credits are running low: ${result.credits} credits remaining.`,
      })
      logger.warn({
        msg: '[Million Verifier] Email credits are running low',
        event: 'email_credits_low',
        metadata: { email, credits: result.credits },
      })
    }

    logger.debug({
      msg: '[Million Verifier] Email verified',
      event: 'email_verified',
      metadata: { email, result },
    })

    httpStatusCode = '200'
    metricsTimer.stop({
      service: 'million_verifier',
      endpoint: 'email_verification',
    })
    externalApiRequestsCounter.inc({
      service: 'million_verifier',
      endpoint: 'email_verification',
      status_code: httpStatusCode,
    })

    return result
  } catch (error) {
    if (httpStatusCode === '500') {
      metricsTimer.stop({
        service: 'million_verifier',
        endpoint: 'email_verification',
      })
      externalApiRequestsCounter.inc({
        service: 'million_verifier',
        endpoint: 'email_verification',
        status_code: httpStatusCode,
      })
    }

    logger.error({
      msg: 'Failed to verify email',
      event: 'failed_to_verify_email',
      metadata: { email, error },
    })
    throw error
  }
}
