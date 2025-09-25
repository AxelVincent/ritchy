import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { websiteRagIndexingPipeline } from '../../../../external/langchain/website_rag_indexing_pipeline'
import { getBusinessCountryCodeByEnrichmentId } from '../../../enrichment/queries/get_business_country_code'
import { insertEnrichmentFacebookBatch } from '../../queries/insert_enrichment_facebook_batch'
import { insertEnrichmentInstagramBatch } from '../../queries/insert_enrichment_instagram_batch'
import { insertEnrichmentLinkedinBatch } from '../../queries/insert_enrichment_linkedin_batch'
import { insertEnrichmentPhone } from '../../queries/insert_enrichment_phone'
import { scrapeWebsiteManager } from '../scrape_website_manager'
import { scrapeWithFallbacks } from '../scrape_with_fallbacks'
import { verifyAndInsertEnrichmentEmail } from '../verify_and_insert_enrichment_email'

// Mock only external dependencies and configs
vi.mock('../../../../config/firecrawl', () => ({
  FIRECRAWL_CONFIG: {
    API_KEY: 'test-api-key',
  },
}))

vi.mock('../../../../config/redis', () => ({
  REDIS_CONFIG: {
    HOST: 'localhost',
    PORT: 6379,
    USER: 'test-user',
    PASSWORD: 'test-password',
    PUBLIC_URL: 'redis://localhost:6379',
  },
  CACHE_THRESHOLDS: {
    PLACE_UPDATE_THRESHOLD: 7776000,
  },
}))

vi.mock('../../../../config/qdrant', () => ({
  QDRANT_CONFIG: {
    API_KEY: 'test-qdrant-key',
    URL: 'http://localhost:6333',
    COLLECTION_NAME: 'test-collection',
  },
}))

vi.mock('../../../../config/drizzle', () => ({
  DRIZZLE_CONFIG: {
    HOST: 'localhost',
    PORT: 5432,
    DATABASE: 'test_db',
    USER: 'test_user',
    PASSWORD: 'test_password',
    PUBLIC_URL: 'postgres://test_user:test_password@localhost:5432/test_db',
  },
}))

// Mock external service calls
vi.mock('../scrape_with_fallbacks', () => ({
  scrapeWithFallbacks: vi.fn(),
}))

vi.mock('../../../../external/langchain/website_rag_indexing_pipeline', () => ({
  websiteRagIndexingPipeline: vi.fn(),
}))

// Update the logger mock to include all required methods
vi.mock('@ritchy/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock database operations
vi.mock('../verify_and_insert_enrichment_email', () => ({
  verifyAndInsertEnrichmentEmail: vi.fn(),
}))

vi.mock('../../queries/insert_enrichment_phone', () => ({
  insertEnrichmentPhone: vi.fn(),
}))

vi.mock('../../queries/insert_enrichment_instagram_batch', () => ({
  insertEnrichmentInstagramBatch: vi.fn(),
}))

vi.mock('../../queries/insert_enrichment_facebook_batch', () => ({
  insertEnrichmentFacebookBatch: vi.fn(),
}))

vi.mock('../../queries/insert_enrichment_linkedin_batch', () => ({
  insertEnrichmentLinkedinBatch: vi.fn(),
}))

vi.mock('../../../enrichment/queries/get_business_country_code', () => ({
  getBusinessCountryCodeByEnrichmentId: vi.fn(),
}))

vi.mock('../../utils/is_social_media_url', () => ({
  isSocialMediaUrl: vi.fn(),
}))

vi.mock('../../../db/db', () => ({
  db: {
    transaction: vi.fn((callback) => callback({})),
  },
}))

describe('scrapeWebsiteManager', () => {
  const mockUrl = 'https://example.com'
  const mockEnrichmentId = 'test-enrichment-id'
  const mockUserPlaceId = 'test-place-id'

  beforeEach(async () => {
    vi.clearAllMocks()

    // Mock scrapeWithFallbacks to return successful result with comprehensive HTML
    vi.mocked(scrapeWithFallbacks).mockResolvedValue({
      success: true,
      html: `
        <html>
          <head>
            <title>Test Website</title>
            <meta name="description" content="Test description">
          </head>
          <body>
            <h1>Test Page</h1>
            <p>Contact us at test@example.com, support@example.com, or sales.team@example.com</p>
            <p>Call us at +33612345678 or +33698765432</p>
            <!-- Instagram links for test, test_global, test.updates -->
            <a href="https://instagram.com/test">Instagram Main</a>
            <a href="https://instagram.com/test_global">Instagram Global</a>
            <a href="https://instagram.com/test.updates">Instagram Updates</a>
            <!-- Facebook links for test, test.community, test.events -->
            <a href="https://facebook.com/test">Facebook Main</a>
            <a href="https://facebook.com/test.community">Facebook Community</a>
            <a href="https://facebook.com/test.events">Facebook Events</a>
            <!-- LinkedIn link - only one as expected by test -->
            <a href="https://linkedin.com/company/test">LinkedIn Company</a>
            <a href="/about">About Us</a>
            <a href="https://example.com/contact">Contact</a>
            <a href="/services">Services</a>
            <a href="/products">Products</a>
            <a href="/team">Team</a>
            <a href="/locations/paris">Paris Office</a>
            <a href="/locations/london">London Office</a>
            <a href="/locations/berlin">Berlin Office</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/sitemap">Sitemap</a>
            <a href="/partners/local">Local Partners</a>
          </body>
        </html>
      `,
      markdown: '# Test Content',
      status: 'success',
      metadata: {
        statusCode: 200,
        responseTimeInSeconds: 1.5,
      },
    })

    // Mock database operations
    vi.mocked(insertEnrichmentInstagramBatch).mockResolvedValue(undefined)
    vi.mocked(insertEnrichmentFacebookBatch).mockResolvedValue(undefined)
    vi.mocked(insertEnrichmentLinkedinBatch).mockResolvedValue(undefined)
    vi.mocked(verifyAndInsertEnrichmentEmail).mockResolvedValue(undefined)
    vi.mocked(insertEnrichmentPhone).mockResolvedValue(undefined)
    vi.mocked(websiteRagIndexingPipeline).mockResolvedValue(undefined)
    vi.mocked(getBusinessCountryCodeByEnrichmentId).mockResolvedValue('US')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should correctly handle root path links', async () => {
    // Simplified HTML with just the root path link
    vi.mocked(scrapeWithFallbacks).mockResolvedValue({
      success: true,
      html: `
        <html>
          <body>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </body>
        </html>
      `,
      markdown: '# Test Content',
      status: 'success',
      metadata: {
        statusCode: 200,
        responseTimeInSeconds: 1.5,
      },
    })

    const result = await scrapeWebsiteManager(
      'https://example.com',
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    expect('error' in result).toBe(false)
    if ('error' in result) return

    // Test specifically for root path handling
    expect(result.links.internal).not.toContain('https://example.com/')
    expect(result.links.internal).toContain('https://example.com/about')
  })

  it('should exclude the scraped URL from internal links', async () => {
    const scrapedUrl = 'https://example.com'

    vi.mocked(scrapeWithFallbacks).mockResolvedValue({
      success: true,
      html: `
        <html>
          <body>
            <!-- Different variations of the scraped URL - should all be excluded -->
            <a href="/">Home</a>
            <a href="https://example.com">Home</a>
            <a href="https://example.com/">Home</a>
            <a href="/about">About</a>
            <a href="https://example.com/about">About</a>
          </body>
        </html>
      `,
      markdown: '# Test Content',
      status: 'success',
      metadata: {
        statusCode: 200,
        responseTimeInSeconds: 1.5,
      },
    })

    const result = await scrapeWebsiteManager(
      scrapedUrl,
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    expect('error' in result).toBe(false)
    if ('error' in result) return

    // Should exclude all variations of the scraped URL
    expect(result.links.internal).not.toContain('https://example.com')
    expect(result.links.internal).not.toContain('https://example.com/')
    expect(result.links.internal).toContain('https://example.com/about')
  })

  it('should successfully scrape a website and extract all data', async () => {
    const result = await scrapeWebsiteManager(
      mockUrl,
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    // Verify successful result
    expect('error' in result).toBe(false)
    if ('error' in result) return // TypeScript guard

    expect(result.metadata).toEqual({
      statusCode: 200,
      responseTimeInSeconds: 1.5,
    })

    // Verify internal links were processed
    expect(result.links.internal).toEqual(
      expect.arrayContaining([
        'https://example.com/about',
        'https://example.com/services',
        'https://example.com/contact',
        'https://example.com/products',
        'https://example.com/team',
        'https://example.com/locations/paris',
        'https://example.com/locations/london',
        'https://example.com/locations/berlin',
        'https://example.com/privacy',
        'https://example.com/terms',
        'https://example.com/sitemap',
        'https://example.com/partners/local',
      ]),
    )

    // Verify social media insertions
    expect(insertEnrichmentInstagramBatch).toHaveBeenCalledWith(
      mockEnrichmentId,
      expect.arrayContaining([
        expect.objectContaining({ username: 'test' }),
        expect.objectContaining({ username: 'test_global' }),
        expect.objectContaining({ username: 'test.updates' }),
      ]),
      expect.any(Object), // transaction object
    )

    expect(insertEnrichmentFacebookBatch).toHaveBeenCalledWith(
      mockEnrichmentId,
      expect.arrayContaining([
        expect.objectContaining({ username: 'test' }),
        expect.objectContaining({ username: 'test.community' }),
        expect.objectContaining({ username: 'test.events' }),
      ]),
      expect.any(Object), // transaction object
    )

    // In the main test, update the LinkedIn expectations
    expect(insertEnrichmentLinkedinBatch).toHaveBeenCalledWith(
      mockEnrichmentId,
      [
        {
          name: 'test',
          type: 'company',
          url: 'https://www.linkedin.com/company/test',
        },
      ],
      expect.any(Object), // transaction object
    )

    // Verify email insertions - updated parameter order
    const expectedEmails = [
      'test@example.com',
      'support@example.com',
      'sales.team@example.com',
    ]

    for (const email of expectedEmails) {
      expect(verifyAndInsertEnrichmentEmail).toHaveBeenCalledWith(
        mockUserPlaceId,
        mockEnrichmentId,
        mockUrl,
        email,
      )
    }

    // Updated phone verification section with correct parameter order
    expect(insertEnrichmentPhone).toHaveBeenNthCalledWith(
      1,
      mockUserPlaceId,
      mockEnrichmentId,
      mockUrl,
      '+33612345678',
    )

    expect(insertEnrichmentPhone).toHaveBeenNthCalledWith(
      2,
      mockUserPlaceId,
      mockEnrichmentId,
      mockUrl,
      '+33698765432',
    )

    // Verify total number of calls
    expect(insertEnrichmentPhone).toHaveBeenCalledTimes(2)

    // Verify RAG pipeline was called
    expect(websiteRagIndexingPipeline).toHaveBeenCalledWith(
      'example.com',
      mockUrl,
      '# Test Content',
    )
  })

  it('should handle scraping errors gracefully', async () => {
    vi.mocked(scrapeWithFallbacks).mockResolvedValue({
      success: false,
      error: 'Failed to scrape',
      status: 'error',
      html: '',
      markdown: '',
      metadata: {
        statusCode: 500,
        responseTimeInSeconds: 2.0,
      },
    })

    const result = await scrapeWebsiteManager(
      mockUrl,
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    expect('error' in result).toBe(true)
    if (!('error' in result)) return // TypeScript guard

    expect((result.error as Error).name).toBe('ScrapeError')
    expect((result.error as Error).message).toBe('Failed to scrape website')
  })

  it('should handle empty HTML responses', async () => {
    vi.mocked(scrapeWithFallbacks).mockResolvedValue({
      success: true,
      status: 'success',
      html: '',
      markdown: '',
      metadata: {
        statusCode: 200,
        responseTimeInSeconds: 1.0,
      },
    })

    // The implementation catches errors and returns error objects instead of throwing
    const result = await scrapeWebsiteManager(
      mockUrl,
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect((result.error as Error).name).toBe('ScrapeError')
      expect((result.error as Error).message).toBe(
        'No response returned from scrape',
      )
    }
  })

  it('should respect onlyMainContent flag', async () => {
    await scrapeWebsiteManager(mockUrl, mockEnrichmentId, true, mockUserPlaceId)

    expect(scrapeWithFallbacks).toHaveBeenCalledWith(
      mockUrl,
      mockUserPlaceId,
      expect.objectContaining({
        onlyMainContent: true,
      }),
    )
  })

  it('should use provided country code for scraping', async () => {
    vi.mocked(getBusinessCountryCodeByEnrichmentId).mockResolvedValue('FR')

    await scrapeWebsiteManager(
      mockUrl,
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    expect(scrapeWithFallbacks).toHaveBeenCalledWith(mockUrl, mockUserPlaceId, {
      formats: ['markdown', 'html'],
      excludeTags: ['img', 'script', 'style', 'link', 'meta', 'noscript'],
      onlyMainContent: false,
      proxy: 'auto',
      country: 'FR',
    })
  })

  it('should handle unexpected errors during processing', async () => {
    const testError = new Error('Unexpected error')
    vi.mocked(scrapeWithFallbacks).mockRejectedValue(testError)

    const result = await scrapeWebsiteManager(
      mockUrl,
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    expect('error' in result).toBe(true)
    if (!('error' in result)) return // TypeScript guard

    expect((result.error as Error).name).toBe('ScrapeError')
    expect((result.error as Error).message).toBe('Unexpected error')
    expect((result.error as Error).stack).toBeDefined()
  })

  it('should not consider social media URLs as internal links even if they contain part of main domain', async () => {
    vi.mocked(scrapeWithFallbacks).mockResolvedValue({
      success: true,
      html: `
        <html>
          <body>
            <a href="https://facebook.com/examplecompany">Facebook</a>
            <a href="https://instagram.com/example_company">Instagram</a>
            <a href="https://linkedin.com/company/example-company">LinkedIn</a>
            <a href="https://example.com/about">About Us</a>
          </body>
        </html>
      `,
      markdown: '# Test Content',
      status: 'success',
      metadata: {
        statusCode: 200,
        responseTimeInSeconds: 1.5,
      },
    })

    const result = await scrapeWebsiteManager(
      'https://example.com',
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    expect('error' in result).toBe(false)
    if ('error' in result) return

    // Should not include social media URLs as internal links
    expect(result.links.internal).not.toContain(
      'https://facebook.com/examplecompany',
    )
    expect(result.links.internal).not.toContain(
      'https://instagram.com/example_company',
    )
    expect(result.links.internal).not.toContain(
      'https://linkedin.com/company/example-company',
    )

    // Should include actual internal links
    expect(result.links.internal).toContain('https://example.com/about')
  })

  it('should filter out non-web content URLs from internal links', async () => {
    vi.mocked(scrapeWithFallbacks).mockResolvedValue({
      success: true,
      html: `
        <html>
          <body>
            <!-- Web content URLs - should be included -->
            <a href="/about">About Us</a>
            <a href="/contact.html">Contact</a>
            <a href="/services.php">Services</a>
            <a href="/api/endpoint">API</a>
            <a href="/products/category">Products</a>
            
            <!-- Non-web content URLs - should be excluded -->
            <a href="/documents/brochure.pdf">Brochure PDF</a>
            <a href="/images/logo.png">Logo</a>
            <a href="/photos/team.jpg">Team Photo</a>
            <a href="/videos/demo.mp4">Demo Video</a>
            <a href="/audio/podcast.mp3">Podcast</a>
            <a href="/downloads/software.zip">Software Download</a>
            <a href="/files/document.doc">Document</a>
            <a href="/spreadsheets/data.xlsx">Data</a>
            <a href="/fonts/custom.ttf">Font</a>
            <a href="/data/export.json">JSON Data</a>
            <a href="/feeds/rss.xml">RSS Feed</a>
            
            <!-- URLs with query params and fragments - extension filtering should still work -->
            <a href="/document.pdf?download=true">PDF with params</a>
            <a href="/image.png#view">Image with fragment</a>
            <a href="/page.html?id=123#section">HTML with params and fragment</a>
          </body>
        </html>
      `,
      markdown: '# Test Content',
      status: 'success',
      metadata: {
        statusCode: 200,
        responseTimeInSeconds: 1.5,
      },
    })

    const result = await scrapeWebsiteManager(
      'https://example.com',
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    expect('error' in result).toBe(false)
    if ('error' in result) return

    // Should include web content URLs
    expect(result.links.internal).toContain('https://example.com/about')
    expect(result.links.internal).toContain('https://example.com/contact.html')
    expect(result.links.internal).toContain('https://example.com/services.php')
    expect(result.links.internal).toContain('https://example.com/api/endpoint')
    expect(result.links.internal).toContain(
      'https://example.com/products/category',
    )
    expect(result.links.internal).toContain('https://example.com/page.html')

    // Should NOT include non-web content URLs
    expect(result.links.internal).not.toContain(
      'https://example.com/documents/brochure.pdf',
    )
    expect(result.links.internal).not.toContain(
      'https://example.com/images/logo.png',
    )
    expect(result.links.internal).not.toContain(
      'https://example.com/photos/team.jpg',
    )
    expect(result.links.internal).not.toContain(
      'https://example.com/videos/demo.mp4',
    )
    expect(result.links.internal).not.toContain(
      'https://example.com/audio/podcast.mp3',
    )
    expect(result.links.internal).not.toContain(
      'https://example.com/downloads/software.zip',
    )
    expect(result.links.internal).not.toContain(
      'https://example.com/files/document.doc',
    )
    expect(result.links.internal).not.toContain(
      'https://example.com/spreadsheets/data.xlsx',
    )
    expect(result.links.internal).not.toContain(
      'https://example.com/fonts/custom.ttf',
    )
    expect(result.links.internal).not.toContain(
      'https://example.com/data/export.json',
    )
    expect(result.links.internal).not.toContain(
      'https://example.com/feeds/rss.xml',
    )
    expect(result.links.internal).not.toContain(
      'https://example.com/document.pdf',
    )
    expect(result.links.internal).not.toContain('https://example.com/image.png')
  })

  it('should handle edge cases in URL filtering correctly', async () => {
    vi.mocked(scrapeWithFallbacks).mockResolvedValue({
      success: true,
      html: `
        <html>
          <body>
            <!-- URLs with dots in directory names - should be included -->
            <a href="/api/v1.0/users">API v1.0</a>
            <a href="/app.v2/dashboard">App v2</a>
            
            <!-- URLs with extensions in directory names but no file extension - should be included -->
            <a href="/images.old/gallery">Gallery</a>
            <a href="/docs.backup/help">Help</a>
            
            <!-- URLs with multiple dots - extension should be the last part -->
            <a href="/file.backup.pdf">Backup PDF</a>
            <a href="/script.min.js">Minified JS</a>
            
            <!-- Empty and malformed links - should be handled gracefully -->
            <a href="">Empty</a>
            <a href="#fragment-only">Fragment only</a>
            <a href="?query-only">Query only</a>
          </body>
        </html>
      `,
      markdown: '# Test Content',
      status: 'success',
      metadata: {
        statusCode: 200,
        responseTimeInSeconds: 1.5,
      },
    })

    const result = await scrapeWebsiteManager(
      'https://example.com',
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    expect('error' in result).toBe(false)
    if ('error' in result) return

    // Should include URLs with dots in directory names
    expect(result.links.internal).toContain(
      'https://example.com/api/v1.0/users',
    )
    expect(result.links.internal).toContain(
      'https://example.com/app.v2/dashboard',
    )
    expect(result.links.internal).toContain(
      'https://example.com/images.old/gallery',
    )
    expect(result.links.internal).toContain(
      'https://example.com/docs.backup/help',
    )

    // Should exclude files with extensions even if they have multiple dots
    expect(result.links.internal).not.toContain(
      'https://example.com/file.backup.pdf',
    )
    expect(result.links.internal).not.toContain(
      'https://example.com/script.min.js',
    )
  })
})
