import { logger } from '@ritchy/logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../db/db'
import { processSocialMediaDomain } from '../process_social_media_domain'
import { isSocialMediaUrl } from '../utils/is_social_media_url'

vi.mock('../../../db/db', () => ({
  db: {
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation(() => ({
        returning: vi.fn().mockResolvedValue([{}]),
      })),
    })),
  },
}))

vi.mock('@ritchy/logger')
vi.mock('../utils/is_social_media_url')

describe('processSocialMediaDomain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isSocialMediaUrl).mockReturnValue(true)
  })

  it('should process LinkedIn website correctly', async () => {
    await processSocialMediaDomain({
      enrichmentId: 'test-enrichment-id',
      website: 'https://linkedin.com/company/test',
    })

    expect(logger.info).toHaveBeenNthCalledWith(1, {
      msg: 'Processing social media url',
      event: 'processing_social_media_url',
      metadata: { website: 'https://linkedin.com/company/test' },
    })

    expect(logger.info).toHaveBeenNthCalledWith(2, {
      msg: 'Website is a LinkedIn url',
      event: 'website_is_linkedin_url',
      metadata: { website: 'https://linkedin.com/company/test' },
    })
  })

  it('should process Facebook website correctly', async () => {
    await processSocialMediaDomain({
      enrichmentId: 'test-enrichment-id',
      website: 'https://facebook.com/test',
    })

    expect(logger.info).toHaveBeenNthCalledWith(1, {
      msg: 'Processing social media url',
      event: 'processing_social_media_url',
      metadata: { website: 'https://facebook.com/test' },
    })

    expect(logger.info).toHaveBeenNthCalledWith(2, {
      msg: 'Website is a Facebook url',
      event: 'website_is_facebook_url',
      metadata: { website: 'https://facebook.com/test' },
    })
  })

  it('should process Instagram website correctly', async () => {
    await processSocialMediaDomain({
      enrichmentId: 'test-enrichment-id',
      website: 'https://instagram.com/test',
    })

    expect(logger.info).toHaveBeenNthCalledWith(1, {
      msg: 'Processing social media url',
      event: 'processing_social_media_url',
      metadata: { website: 'https://instagram.com/test' },
    })

    expect(logger.info).toHaveBeenNthCalledWith(2, {
      msg: 'Website is an Instagram url',
      event: 'website_is_instagram_url',
      metadata: { website: 'https://instagram.com/test' },
    })
  })

  it('should return early if website is not a social media url', async () => {
    vi.mocked(isSocialMediaUrl).mockReturnValue(false)

    await processSocialMediaDomain({
      enrichmentId: 'test-enrichment-id',
      website: 'https://example.com',
    })

    expect(logger.info).toHaveBeenNthCalledWith(1, {
      msg: 'Processing social media url',
      event: 'processing_social_media_url',
      metadata: { website: 'https://example.com' },
    })

    expect(logger.info).toHaveBeenNthCalledWith(2, {
      msg: 'Website is not a social media url',
      event: 'website_is_not_social_media_url',
      metadata: { website: 'https://example.com' },
    })

    // Verify no db operations were performed
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    // Mock db.insert to throw an error
    vi.mocked(db.insert).mockImplementation(() => {
      throw new Error('Test error')
    })

    await processSocialMediaDomain({
      enrichmentId: 'test-enrichment-id',
      website: 'https://linkedin.com/test',
    })

    expect(logger.error).toHaveBeenCalledWith({
      msg: 'Error processing social media url',
      event: 'error_processing_social_media_url',
      metadata: {
        website: 'https://linkedin.com/test',
        error: new Error('Test error'),
      },
    })
  })
})
