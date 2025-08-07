import { logger } from '@ritchy/logger'
import type { PgSelect } from 'drizzle-orm/pg-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../../db/db'
import { verifyWithMillionVerifier } from '../../../../external/million_verifier'
import { insertEnrichmentEmail } from '../../queries/insert_enrichment_email'
import { verifyAndInsertEnrichmentEmail } from '../verify_and_insert_enrichment_email'

// Mock dependencies
vi.mock('../../../../db/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn() })) })),
    })),
  },
}))

vi.mock('../../../../external/million_verifier', () => ({
  verifyWithMillionVerifier: vi.fn(),
}))

vi.mock('../../queries/insert_enrichment_email', () => ({
  insertEnrichmentEmail: vi.fn(),
}))

vi.mock('@ritchy/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('verifyAndInsertEnrichmentEmail', () => {
  const mockEnrichmentId = 'test-enrichment-id'
  const mockSource = 'https://example.com'
  const mockEmail = 'Test.Email@Example.com'
  const normalizedEmail = 'test.email@example.com'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should normalize email to lowercase and trim', async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>)

    vi.mocked(verifyWithMillionVerifier).mockResolvedValue({
      email: normalizedEmail,
      error: '',
      quality: 'good',
      result: 'ok',
      role: false,
      free: false,
      resultcode: 1,
      subresult: 'ok',
      didyoumean: '',
      livemode: true,
      credits: 1,
      executiontime: 1,
    })

    await verifyAndInsertEnrichmentEmail(
      mockEnrichmentId,
      mockSource,
      ' Test.Email@Example.com ',
    )

    expect(verifyWithMillionVerifier).toHaveBeenCalledWith(normalizedEmail)
  })

  it('should skip if email already exists', async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 1, email: normalizedEmail }]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>)

    await verifyAndInsertEnrichmentEmail(
      mockEnrichmentId,
      mockSource,
      mockEmail,
    )

    expect(verifyWithMillionVerifier).not.toHaveBeenCalled()
    expect(insertEnrichmentEmail).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith({
      msg: `[Verify and Insert Enrichment Email] Email already exists and verified: ${normalizedEmail}`,
      event: 'email_already_exists',
      metadata: { enrichmentId: mockEnrichmentId, email: normalizedEmail },
    })
  })

  it('should not insert email if verification fails', async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>)

    vi.mocked(verifyWithMillionVerifier).mockResolvedValue({
      email: normalizedEmail,
      error: 'Invalid email',
      quality: 'bad' as const,
      result: 'invalid' as const,
      role: false,
      free: false,
      resultcode: 1,
      subresult: 'ok' as const,
      didyoumean: '',
      livemode: true,
      credits: 1,
      executiontime: 1,
    })

    await verifyAndInsertEnrichmentEmail(
      mockEnrichmentId,
      mockSource,
      mockEmail,
    )

    expect(insertEnrichmentEmail).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith({
      msg: `[Verify and Insert Enrichment Email] Email not safe to save : ${normalizedEmail} - invalid`,
      event: 'email_not_safe_to_save',
      metadata: {
        enrichmentId: mockEnrichmentId,
        email: normalizedEmail,
        verificationResult: {
          email: normalizedEmail,
          error: 'Invalid email',
          quality: 'bad',
          result: 'invalid',
          role: false,
          free: false,
          resultcode: 1,
          subresult: 'ok',
          didyoumean: '',
          livemode: true,
          credits: 1,
          executiontime: 1,
        },
      },
    })
  })

  it('should insert email when verification succeeds', async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>)

    const verificationResult = {
      email: normalizedEmail,
      error: '',
      quality: 'good' as const,
      result: 'ok' as const,
      role: false,
      free: false,
      resultcode: 1,
      subresult: 'ok' as const,
      didyoumean: '',
      livemode: true,
      credits: 1,
      executiontime: 1,
    }

    vi.mocked(verifyWithMillionVerifier).mockResolvedValue(verificationResult)

    await verifyAndInsertEnrichmentEmail(
      mockEnrichmentId,
      mockSource,
      mockEmail,
    )

    expect(insertEnrichmentEmail).toHaveBeenCalledWith(
      mockEnrichmentId,
      mockSource,
      verificationResult.email,
      verificationResult.quality,
      verificationResult.result,
      verificationResult.free,
      verificationResult.role,
    )
  })

  it('should handle database query errors', async () => {
    const dbError = new Error('Database error')
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(dbError),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>)

    await verifyAndInsertEnrichmentEmail(
      mockEnrichmentId,
      mockSource,
      mockEmail,
    )

    expect(verifyWithMillionVerifier).not.toHaveBeenCalled()
    expect(insertEnrichmentEmail).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith({
      msg: 'Failed to verify and insert enrichment email',
      event: 'failed_to_verify_and_insert_enrichment_email',
      metadata: {
        enrichmentId: mockEnrichmentId,
        email: mockEmail,
        error: dbError,
      },
    })
  })

  it('should handle verification service errors', async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>)

    const verificationError = new Error('Verification service error')
    vi.mocked(verifyWithMillionVerifier).mockRejectedValue(verificationError)

    await verifyAndInsertEnrichmentEmail(
      mockEnrichmentId,
      mockSource,
      mockEmail,
    )

    expect(insertEnrichmentEmail).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith({
      msg: 'Failed to verify and insert enrichment email',
      event: 'failed_to_verify_and_insert_enrichment_email',
      metadata: {
        enrichmentId: mockEnrichmentId,
        email: mockEmail,
        error: verificationError,
      },
    })
  })
})
