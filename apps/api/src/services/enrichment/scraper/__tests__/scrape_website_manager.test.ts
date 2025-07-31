import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scrapeWithRetry } from '../../../../external/firecrawl'
import { websiteRagIndexingPipeline } from '../../../../external/langchain/website_rag_indexing_pipeline'
import { getBusinessCountryCodeByEnrichmentId } from '../../../enrichment/queries/get_business_country_code'
import { insertEnrichmentEmail } from '../../queries/insert_enrichment_email'
import { insertEnrichmentFacebookBatch } from '../../queries/insert_enrichment_facebook_batch'
import { insertEnrichmentInstagramBatch } from '../../queries/insert_enrichment_instagram_batch'
import { insertEnrichmentLinkedinBatch } from '../../queries/insert_enrichment_linkedin_batch'
import { insertEnrichmentPhone } from '../../queries/insert_enrichment_phone'
import { scrapeWebsiteManager } from '../scrape_website_manager'

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
    USER: 'test-user',
    PORT: '6333',
    MANAGEMENT_PORT: '6334',
    API_PORT: '6333',
    HOST: 'localhost',
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
vi.mock('../../../../external/firecrawl', () => ({
  scrapeWithRetry: vi.fn(),
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
vi.mock('../../queries/insert_enrichment_email', () => ({
  insertEnrichmentEmail: vi.fn(),
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

describe('scrapeWebsiteManager', () => {
  const mockUrl = 'https://example.com'
  const mockEnrichmentId = 'test-enrichment-id'
  const mockUserPlaceId = 'test-place-id'

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    vi.mocked(getBusinessCountryCodeByEnrichmentId).mockResolvedValue('US')
    vi.mocked(scrapeWithRetry).mockResolvedValue({
      success: true,
      rawHtml: `
        <html>
          <body>
            <header>
              <nav>
                <a href="/">Home</a>
                <a href="/about">About Us</a>
                <a href="/services">Our Services</a>
                <a href="https://example.com/contact">Contact</a>
                <a href="../products">Products</a>
                <a href="./team">Our Team</a>
              </nav>
            </header>

            <main>
              <section class="social-links">
                <h2>Follow Us</h2>
                <ul>
                  <li><a href="https://instagram.com/test">Instagram</a></li>
                  <li><a href="https://instagram.com/test_global">Global Instagram</a></li>
                  <li><a href="https://facebook.com/test">Facebook</a></li>
                  <li><a href="https://facebook.com/test.community">Community Facebook</a></li>
                  <li><a href="https://linkedin.com/company/test">LinkedIn Company</a></li>
                  <li><a href="https://linkedin.com/showcase/test-products">LinkedIn Products</a></li>
                </ul>
              </section>

              <section class="partners">
                <h2>Our Partners</h2>
                <ul>
                  <li><a href="https://partner1.com">Partner 1</a></li>
                  <li><a href="https://partner2.com">Partner 2</a></li>
                  <li><a href="https://example.com/partners/local">Local Partners</a></li>
                </ul>
              </section>

              <section class="contact-info">
                <h2>Get in Touch</h2>
                <div class="emails">
                  <p>General inquiries: <a href="mailto:test@example.com">test@example.com</a></p>
                  <p>Support: <a href="mailto:support@example.com">support@example.com</a></p>
                  <p>Sales: sales.team@example.com</p>
                </div>
                <div class="phones">
                  <p>Main Office: <a href="tel:+33612345678">+33 6 12 34 56 78</a></p>
                  <p>Support: +33 6 98 76 54 32</p>
                  <p>International: +1 (555) 123-4567</p>
                </div>
              </section>

              <section class="locations">
                <h2>Our Locations</h2>
                <ul>
                  <li><a href="/locations/paris">Paris Office</a></li>
                  <li><a href="https://example.com/locations/london">London Office</a></li>
                  <li><a href="../locations/berlin">Berlin Office</a></li>
                </ul>
              </section>
            </main>

            <footer>
              <nav>
                <a href="/privacy">Privacy Policy</a>
                <a href="/terms">Terms of Service</a>
                <a href="https://example.com/sitemap">Sitemap</a>
                <a href="#top">Back to Top</a>
              </nav>
              <div class="social-mini">
                <a href="https://instagram.com/test.updates">Latest Updates</a>
                <a href="https://facebook.com/test.events">Events</a>
                <a href="https://linkedin.com/school/test-academy">Academy</a>
              </div>
            </footer>
          </body>
        </html>
      `,
      markdown: '# Test Content',
      metadata: {
        title: 'Test Page',
        description: 'Test Description',
        language: 'en',
        keywords: 'test',
        robots: 'index,follow',
      },
    })

    // Mock database operations
    vi.mocked(insertEnrichmentInstagramBatch).mockResolvedValue(undefined)
    vi.mocked(insertEnrichmentFacebookBatch).mockResolvedValue(undefined)
    vi.mocked(insertEnrichmentLinkedinBatch).mockResolvedValue(undefined)
    vi.mocked(insertEnrichmentEmail).mockResolvedValue(undefined)
    vi.mocked(insertEnrichmentPhone).mockResolvedValue(undefined)
    vi.mocked(websiteRagIndexingPipeline).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should correctly handle root path links', async () => {
    // Simplified HTML with just the root path link
    vi.mocked(scrapeWithRetry).mockResolvedValue({
      success: true,
      rawHtml: `
        <html>
          <body>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </body>
        </html>
      `,
      markdown: '# Test Content',
      metadata: {
        title: '',
        description: '',
        language: '',
        keywords: '',
        robots: '',
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

    vi.mocked(scrapeWithRetry).mockResolvedValue({
      success: true,
      rawHtml: `
        <html>
          <body>
            <!-- Different variations of the scraped URL - should all be excluded -->
            <a href="/">Home</a>
            <a href="${scrapedUrl}">Same as scraped</a>
            <a href="${scrapedUrl}/">With trailing slash</a>

            <!-- Other internal links - should be included -->
            <a href="/about">About</a>
            <a href="${scrapedUrl}/contact">Contact</a>
          </body>
        </html>
      `,
      markdown: '# Test Content',
      metadata: {
        title: '',
        description: '',
        language: '',
        keywords: '',
        robots: '',
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

    // These URLs should be included
    expect(result.links.internal).toEqual(
      expect.arrayContaining([
        'https://example.com/about',
        'https://example.com/contact',
      ]),
    )

    // The scraped URL and its variations should be excluded
    const excludedUrls = ['https://example.com', 'https://example.com/']

    for (const url of excludedUrls) {
      expect(result.links.internal).not.toContain(url)
    }

    // Should only have the two internal links
    expect(result.links.internal).toHaveLength(2)
  })

  it('should successfully scrape a website and extract all data', async () => {
    const result = await scrapeWebsiteManager(
      mockUrl,
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    // Debug: Log the result if it's an error
    if ('error' in result) {
      console.log('Scrape error:', {
        name: result.error.name,
        message: result.error.message,
        stack: result.error.stack,
      })
    }

    // Verify successful result
    expect('error' in result).toBe(false)
    if ('error' in result) return // TypeScript guard

    expect(result.metadata).toEqual({
      title: 'Test Page',
      description: 'Test Description',
      language: 'en',
      keywords: 'test',
      robots: 'index,follow',
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
    )

    expect(insertEnrichmentFacebookBatch).toHaveBeenCalledWith(
      mockEnrichmentId,
      expect.arrayContaining([
        expect.objectContaining({ username: 'test' }),
        expect.objectContaining({ username: 'test.community' }),
        expect.objectContaining({ username: 'test.events' }),
      ]),
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
    )

    // Verify email insertions
    const expectedEmails = [
      'test@example.com',
      'support@example.com',
      'sales.team@example.com',
    ]

    for (const email of expectedEmails) {
      expect(insertEnrichmentEmail).toHaveBeenCalledWith(
        mockEnrichmentId,
        mockUrl,
        email,
      )
    }

    // In the main test, update the phone verification section to match exactly what we expect
    expect(insertEnrichmentPhone).toHaveBeenNthCalledWith(
      1,
      mockEnrichmentId,
      mockUrl,
      '+33612345678',
    )

    expect(insertEnrichmentPhone).toHaveBeenNthCalledWith(
      2,
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

  it('should handle scraping failure', async () => {
    vi.mocked(scrapeWithRetry).mockResolvedValue({
      success: false,
      error: 'Failed to scrape',
      rawHtml: null,
      markdown: null,
      metadata: null,
    })

    const result = await scrapeWebsiteManager(
      mockUrl,
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    expect('error' in result).toBe(true)
    if (!('error' in result)) return // TypeScript guard

    expect(result.error.name).toBe('ScrapeError')
    expect(result.error.message).toBe('Failed to scrape website')
  })

  it('should handle missing HTML and markdown', async () => {
    vi.mocked(scrapeWithRetry).mockResolvedValue({
      success: true,
      rawHtml: null,
      markdown: null,
      metadata: null,
    })

    const result = await scrapeWebsiteManager(
      mockUrl,
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    expect('error' in result).toBe(true)
    if (!('error' in result)) return // TypeScript guard

    expect(result.error.name).toBe('ScrapeError')
    expect(result.error.message).toBe('No response returned from scrape')
  })

  it('should respect onlyMainContent flag', async () => {
    await scrapeWebsiteManager(mockUrl, mockEnrichmentId, true, mockUserPlaceId)

    expect(scrapeWithRetry).toHaveBeenCalledWith(
      mockUrl,
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

    expect(scrapeWithRetry).toHaveBeenCalledWith(
      mockUrl,
      expect.objectContaining({
        location: {
          country: 'FR',
        },
      }),
    )
  })

  it('should handle unexpected errors during processing', async () => {
    const testError = new Error('Unexpected error')
    vi.mocked(scrapeWithRetry).mockRejectedValue(testError)

    const result = await scrapeWebsiteManager(
      mockUrl,
      mockEnrichmentId,
      false,
      mockUserPlaceId,
    )

    expect('error' in result).toBe(true)
    if (!('error' in result)) return // TypeScript guard

    expect(result.error.name).toBe('ScrapeError')
    expect(result.error.message).toBe('Unexpected error')
    expect(result.error.stack).toBeDefined()
  })
})
