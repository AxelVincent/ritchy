import { logger } from '@ritchy/logger'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../../../db/db'
import { enrichmentEmail } from '../../../../../db/schema/enrichment'
import { verifyEmailForSaving } from '../../../../../external/million_verifier/email_verification'
import { insertEnrichmentEmail } from '../../../shared/queries/insert_enrichment_email'
import { verifyAndInsertEnrichmentEmail } from '../verify_and_insert_enrichment_email'

// Mock dependencies
vi.mock('../../../../../db/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

vi.mock('../../../../../db/schema/enrichment', () => ({
  enrichmentEmail: {},
}))

vi.mock('../../../../../external/million_verifier/email_verification', () => ({
  verifyEmailForSaving: vi.fn(),
}))

vi.mock('../../../shared/queries/insert_enrichment_email', () => ({
  insertEnrichmentEmail: vi.fn(),
}))

vi.mock('@ritchy/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('verifyAndInsertEnrichmentEmail', () => {
  const mockUserPlaceId = 'test-user-place-id'
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
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })
    vi.mocked(db.select).mockReturnValue(mockSelect() as never)

    const verificationResult = {
      email: normalizedEmail,
      quality: 'good' as const,
      result: 'ok' as const,
      free: false,
      role: false,
    }
    vi.mocked(verifyEmailForSaving).mockResolvedValue(verificationResult)

    await verifyAndInsertEnrichmentEmail(
      mockUserPlaceId,
      mockEnrichmentId,
      mockSource,
      ' Test.Email@Example.com ',
    )

    expect(verifyEmailForSaving).toHaveBeenCalledWith(
      normalizedEmail,
      'Verify and Insert Enrichment Email',
      false,
    )
  })

  it('should skip if email already exists', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 1, email: normalizedEmail }]),
        }),
      }),
    })
    vi.mocked(db.select).mockReturnValue(mockSelect() as never)

    await verifyAndInsertEnrichmentEmail(
      mockUserPlaceId,
      mockEnrichmentId,
      mockSource,
      mockEmail,
    )

    expect(verifyEmailForSaving).not.toHaveBeenCalled()
    expect(insertEnrichmentEmail).not.toHaveBeenCalled()
    expect(logger.debug).toHaveBeenCalledWith({
      msg: `[Verify and Insert Enrichment Email] Email already exists and verified: ${normalizedEmail}`,
      event: 'email_already_exists',
      metadata: {
        userPlaceId: mockUserPlaceId,
        enrichmentId: mockEnrichmentId,
        email: normalizedEmail,
      },
    })
  })

  it('should not insert email if verification throws error', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })
    vi.mocked(db.select).mockReturnValue(mockSelect() as never)

    const verificationError = new Error('Email not safe to save: invalid')
    vi.mocked(verifyEmailForSaving).mockRejectedValue(verificationError)

    await verifyAndInsertEnrichmentEmail(
      mockUserPlaceId,
      mockEnrichmentId,
      mockSource,
      mockEmail,
    )

    expect(insertEnrichmentEmail).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith({
      msg: 'Failed to verify and insert enrichment email',
      event: 'failed_to_verify_and_insert_enrichment_email',
      metadata: {
        userPlaceId: mockUserPlaceId,
        enrichmentId: mockEnrichmentId,
        email: mockEmail,
        error: verificationError,
      },
    })
  })

  it('should insert email when verification succeeds', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })
    vi.mocked(db.select).mockReturnValue(mockSelect() as never)

    const verificationResult = {
      email: normalizedEmail,
      quality: 'good' as const,
      result: 'ok' as const,
      free: false,
      role: false,
    }

    vi.mocked(verifyEmailForSaving).mockResolvedValue(verificationResult)

    await verifyAndInsertEnrichmentEmail(
      mockUserPlaceId,
      mockEnrichmentId,
      mockSource,
      mockEmail,
    )

    expect(verifyEmailForSaving).toHaveBeenCalledWith(
      normalizedEmail,
      'Verify and Insert Enrichment Email',
      false,
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
    expect(logger.debug).toHaveBeenCalledWith({
      msg: `[Verify and Insert Enrichment Email] Email verified and inserted: ${verificationResult.email}`,
      event: 'enrichment_email_verified_and_inserted',
      metadata: {
        userPlaceId: mockUserPlaceId,
        enrichmentId: mockEnrichmentId,
        email: verificationResult.email,
      },
    })
  })

  it('should handle database query errors', async () => {
    const dbError = new Error('Database error')
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(dbError),
        }),
      }),
    })
    vi.mocked(db.select).mockReturnValue(mockSelect() as never)

    await verifyAndInsertEnrichmentEmail(
      mockUserPlaceId,
      mockEnrichmentId,
      mockSource,
      mockEmail,
    )

    expect(verifyEmailForSaving).not.toHaveBeenCalled()
    expect(insertEnrichmentEmail).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith({
      msg: 'Failed to verify and insert enrichment email',
      event: 'failed_to_verify_and_insert_enrichment_email',
      metadata: {
        userPlaceId: mockUserPlaceId,
        enrichmentId: mockEnrichmentId,
        email: mockEmail,
        error: dbError,
      },
    })
  })

  it('should handle verification service errors', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })
    vi.mocked(db.select).mockReturnValue(mockSelect() as never)

    const verificationError = new Error('Verification service error')
    vi.mocked(verifyEmailForSaving).mockRejectedValue(verificationError)

    await verifyAndInsertEnrichmentEmail(
      mockUserPlaceId,
      mockEnrichmentId,
      mockSource,
      mockEmail,
    )

    expect(insertEnrichmentEmail).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith({
      msg: 'Failed to verify and insert enrichment email',
      event: 'failed_to_verify_and_insert_enrichment_email',
      metadata: {
        userPlaceId: mockUserPlaceId,
        enrichmentId: mockEnrichmentId,
        email: mockEmail,
        error: verificationError,
      },
    })
  })
})
