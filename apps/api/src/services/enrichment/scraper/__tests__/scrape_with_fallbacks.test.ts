import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scrapeWithRetry } from '../../../../external/firecrawl'
import { brightdataScraper } from '../brightdata_scraper'
import { scrapeWithFallbacks } from '../scrape_with_fallbacks'

vi.mock('../../../../external/firecrawl', () => ({
  scrapeWithRetry: vi.fn(),
}))

vi.mock('../brightdata_scraper', () => ({
  brightdataScraper: vi.fn(),
}))

vi.mock('@ritchy/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('scrapeWithFallbacks', () => {
  const mockUrl = 'https://example.com'
  const mockUserPlaceId = 'test-user-place-id'
  const mockOptions = {
    formats: ['markdown', 'rawHtml'],
    excludeTags: ['img'],
    onlyMainContent: false,
    country: 'US',
  }

  const mockSuccessResponse = {
    success: true,
    status: 'success',
    rawHtml: '<html><body>Test</body></html>',
    markdown: '# Test',
    html: '<body>Test</body>',
    metadata: {
      statusCode: 200,
      responseTimeInSeconds: 1.5,
    },
  }

  const mockFailureResponse = {
    success: false,
    status: 'error',
    error: 'Failed to fetch',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock external services to return success by default
    vi.mocked(scrapeWithRetry).mockResolvedValue(mockSuccessResponse)
    vi.mocked(brightdataScraper).mockResolvedValue(mockSuccessResponse)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('brightdata scraper success', () => {
    it('should return brightdata scraper result when it succeeds', async () => {
      const result = await scrapeWithFallbacks(
        mockUrl,
        mockUserPlaceId,
        mockOptions,
      )

      expect(brightdataScraper).toHaveBeenCalledWith(mockUrl)
      expect(result).toEqual(mockSuccessResponse)
      expect(scrapeWithRetry).not.toHaveBeenCalled()
    })

    it('should log brightdata scraper success', async () => {
      const logger = await import('@ritchy/logger')

      await scrapeWithFallbacks(mockUrl, mockUserPlaceId, mockOptions)

      expect(logger.logger.debug).toHaveBeenCalledWith({
        msg: '[Scrape Manager] Attempting Brightdata scraper for https://example.com',
        event: 'brightdata_scrape_attempt',
        metadata: { url: mockUrl },
      })

      expect(logger.logger.debug).toHaveBeenCalledWith({
        msg: '[Scrape Manager] Brightdata scraper succeeded for https://example.com',
        event: 'brightdata_scrape_success',
        metadata: { url: mockUrl, userPlaceId: mockUserPlaceId },
      })
    })
  })

  describe('brightdata failure - fallback to firecrawl', () => {
    beforeEach(() => {
      vi.mocked(brightdataScraper).mockResolvedValue(mockFailureResponse)
    })

    it('should fall back to Firecrawl when brightdata scraper fails', async () => {
      const result = await scrapeWithFallbacks(
        mockUrl,
        mockUserPlaceId,
        mockOptions,
      )

      expect(brightdataScraper).toHaveBeenCalledWith(mockUrl)
      expect(scrapeWithRetry).toHaveBeenCalledWith(mockUrl, {
        formats: ['markdown', 'rawHtml'],
        excludeTags: ['img'],
        onlyMainContent: false,
        location: { country: 'US' },
      })
      expect(result).toEqual(mockSuccessResponse)
    })

    it('should log brightdata failure and firecrawl fallback', async () => {
      const logger = await import('@ritchy/logger')

      await scrapeWithFallbacks(mockUrl, mockUserPlaceId, mockOptions)

      expect(logger.logger.debug).toHaveBeenCalledWith({
        msg: '[Scrape Manager] Brightdata scraper failed for https://example.com, falling back to firecrawl',
        event: 'brightdata_scrape_fallback',
        metadata: {
          url: mockUrl,
          userPlaceId: mockUserPlaceId,
          brightdataError: 'Failed to fetch',
        },
      })

      expect(logger.logger.debug).toHaveBeenCalledWith({
        msg: '[Scrape Manager] Firecrawl scrape result for https://example.com',
        event: 'firecrawl_scrape_result',
        metadata: { url: mockUrl, userPlaceId: mockUserPlaceId },
      })
    })

    it('should handle missing country option when falling back to Firecrawl', async () => {
      const optionsWithoutCountry = {
        formats: ['markdown', 'rawHtml'],
        excludeTags: ['img'],
        onlyMainContent: false,
      }

      await scrapeWithFallbacks(mockUrl, mockUserPlaceId, optionsWithoutCountry)

      expect(scrapeWithRetry).toHaveBeenCalledWith(mockUrl, {
        formats: ['markdown', 'rawHtml'],
        excludeTags: ['img'],
        onlyMainContent: false,
        location: undefined,
      })
    })
  })

  describe('error handling', () => {
    it('should propagate errors from Firecrawl when all scrapers fail', async () => {
      vi.mocked(brightdataScraper).mockResolvedValue(mockFailureResponse)
      const mockError = new Error('Firecrawl scrape failed')
      vi.mocked(scrapeWithRetry).mockRejectedValue(mockError)

      await expect(
        scrapeWithFallbacks(mockUrl, mockUserPlaceId, mockOptions),
      ).rejects.toThrow('Firecrawl scrape failed')
    })

    it('should propagate errors from brightdata when brightdata throws', async () => {
      const mockError = new Error('Brightdata scrape failed')
      vi.mocked(brightdataScraper).mockRejectedValue(mockError)

      await expect(
        scrapeWithFallbacks(mockUrl, mockUserPlaceId, mockOptions),
      ).rejects.toThrow('Brightdata scrape failed')
    })
  })

  describe('brightdata success scenarios', () => {
    it('should return brightdata result when brightdata succeeds', async () => {
      const brightdataResponse = {
        ...mockSuccessResponse,
        markdown: '# Brightdata Result',
      }
      vi.mocked(brightdataScraper).mockResolvedValue(brightdataResponse)

      const result = await scrapeWithFallbacks(
        mockUrl,
        mockUserPlaceId,
        mockOptions,
      )

      expect(result).toEqual(brightdataResponse)
      expect(scrapeWithRetry).not.toHaveBeenCalled()
    })

    it('should log brightdata success', async () => {
      const logger = await import('@ritchy/logger')

      await scrapeWithFallbacks(mockUrl, mockUserPlaceId, mockOptions)

      expect(logger.logger.debug).toHaveBeenCalledWith({
        msg: '[Scrape Manager] Brightdata scraper succeeded for https://example.com',
        event: 'brightdata_scrape_success',
        metadata: { url: mockUrl, userPlaceId: mockUserPlaceId },
      })
    })
  })
})
