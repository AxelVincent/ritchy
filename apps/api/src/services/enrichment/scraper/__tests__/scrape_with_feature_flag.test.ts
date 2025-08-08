import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scrapeWithRetry } from '../../../../external/firecrawl'
import { scrapeUrl } from '../../../../external/scrapeless'
import { scrapeWithFeatureFlag } from '../scrape_with_feature_flag'

vi.mock('../../../../external/firecrawl', () => ({
  scrapeWithRetry: vi.fn()
}))

vi.mock('../../../../external/scrapeless', () => ({
  scrapeUrl: vi.fn()
}))

vi.mock('@ritchy/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

describe('scrapeWithFeatureFlag', () => {
  const mockUrl = 'https://example.com'
  const mockOptions = {
    formats: ['markdown', 'rawHtml'],
    excludeTags: ['img'],
    onlyMainContent: false,
    country: 'US'
  }

  const mockSuccessResponse = {
    success: true,
    rawHtml: '<html><body>Test</body></html>',
    markdown: '# Test',
    metadata: { title: 'Test' }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock both services to return success
    vi.mocked(scrapeWithRetry).mockResolvedValue(mockSuccessResponse)
    vi.mocked(scrapeUrl).mockResolvedValue(mockSuccessResponse)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should correctly transform options for Firecrawl', async () => {
    // Force using Firecrawl by mocking Math.random
    vi.spyOn(Math, 'random').mockReturnValue(0.75) // 75% > 50%, so use Firecrawl

    await scrapeWithFeatureFlag(mockUrl, mockOptions)

    expect(scrapeWithRetry).toHaveBeenCalledWith(mockUrl, {
      formats: ['markdown', 'rawHtml'],
      excludeTags: ['img'],
      onlyMainContent: false,
      location: { country: 'US' }
    })
    expect(scrapeUrl).not.toHaveBeenCalled()
  })

  it('should correctly transform options for Scrapeless', async () => {
    // Force using Scrapeless by mocking Math.random
    vi.spyOn(Math, 'random').mockReturnValue(0.25) // 25% < 50%, so use Scrapeless

    await scrapeWithFeatureFlag(mockUrl, mockOptions)

    expect(scrapeUrl).toHaveBeenCalledWith(mockUrl, {
      formats: ['markdown', 'rawHtml'],
      excludeTags: ['img'],
      onlyMainContent: false
    })
    expect(scrapeWithRetry).not.toHaveBeenCalled()
  })

  it('should handle missing country option', async () => {
    const optionsWithoutCountry = {
      formats: ['markdown', 'rawHtml'],
      excludeTags: ['img'],
      onlyMainContent: false
    }

    vi.spyOn(Math, 'random').mockReturnValue(0.75) // Use Firecrawl

    await scrapeWithFeatureFlag(mockUrl, optionsWithoutCountry)

    expect(scrapeWithRetry).toHaveBeenCalledWith(mockUrl, {
      formats: ['markdown', 'rawHtml'],
      excludeTags: ['img'],
      onlyMainContent: false,
      location: undefined
    })
  })

  it('should log which service is being used', async () => {
    const logger = await import('@ritchy/logger')

    // Test Firecrawl case
    vi.spyOn(Math, 'random').mockReturnValue(0.75)
    await scrapeWithFeatureFlag(mockUrl, mockOptions)
    expect(logger.logger.info).toHaveBeenCalledWith({
      msg: '[Scrape Manager] Using service',
      event: 'scrape_service_selection',
      metadata: { service: 'firecrawl', url: mockUrl }
    })

    vi.clearAllMocks()

    // Test Scrapeless case
    vi.spyOn(Math, 'random').mockReturnValue(0.25)
    await scrapeWithFeatureFlag(mockUrl, mockOptions)
    expect(logger.logger.info).toHaveBeenCalledWith({
      msg: '[Scrape Manager] Using service',
      event: 'scrape_service_selection',
      metadata: { service: 'scrapeless', url: mockUrl }
    })
  })

  it('should propagate errors from the selected service', async () => {
    const mockError = new Error('Scrape failed')
    vi.spyOn(Math, 'random').mockReturnValue(0.25) // Use Scrapeless
    vi.mocked(scrapeUrl).mockRejectedValue(mockError)

    await expect(scrapeWithFeatureFlag(mockUrl, mockOptions)).rejects.toThrow(
      'Scrape failed'
    )
  })
})
