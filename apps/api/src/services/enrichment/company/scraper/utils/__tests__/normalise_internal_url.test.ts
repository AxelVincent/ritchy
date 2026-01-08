import { describe, expect, it } from 'vitest'
import { normaliseInternalUrl } from '../normalise_internal_url'

describe('normaliseInternalUrl', () => {
  const BASE_URL = 'https://website.com'

  // Test valid URLs
  it('should handle basic URLs correctly', () => {
    expect(normaliseInternalUrl('https://website.com/about')).toBe(
      'https://website.com/about',
    )
  })

  // Test root path handling
  it('should handle root paths correctly', () => {
    const testCases = [
      {
        input: '/',
        expected: 'https://website.com/',
      },
      {
        input: 'https://website.com',
        expected: 'https://website.com/',
      },
      {
        input: 'https://website.com/',
        expected: 'https://website.com/',
      },
    ]

    for (const { input, expected } of testCases) {
      expect(normaliseInternalUrl(input, BASE_URL)).toBe(expected)
    }
  })

  // Test relative paths with baseUrl
  it('should handle relative paths with baseUrl', () => {
    const testCases = [
      {
        input: '/about',
        expected: 'https://website.com/about',
      },
      {
        input: '/products',
        expected: 'https://website.com/products',
      },
      {
        input: '/contact/',
        expected: 'https://website.com/contact',
      },
      {
        input: '/en/about',
        expected: 'https://website.com/about',
      },
      {
        input: '/about?lang=en',
        expected: 'https://website.com/about',
      },
    ]

    for (const { input, expected } of testCases) {
      expect(normaliseInternalUrl(input, BASE_URL)).toBe(expected)
    }
  })

  // Test relative paths without baseUrl
  it('should return null for relative paths without baseUrl', () => {
    const testCases = ['/about', '/contact', '/products', '/']

    for (const input of testCases) {
      expect(normaliseInternalUrl(input)).toBeNull()
    }
  })

  // Test internationalization paths
  it('should remove internationalization paths', () => {
    const testCases = [
      {
        input: 'https://website.com/en/about',
        expected: 'https://website.com/about',
      },
      {
        input: 'https://website.com/fr-fr/about',
        expected: 'https://website.com/about',
      },
      {
        input: 'https://website.com/en-US/products',
        expected: 'https://website.com/products',
      },
      {
        input: 'https://website.com/fr/',
        expected: 'https://website.com/',
      },
    ]

    for (const { input, expected } of testCases) {
      expect(normaliseInternalUrl(input)).toBe(expected)
    }
  })

  // Test default pages
  it('should remove default page names', () => {
    const testCases = [
      {
        input: 'https://website.com/about/index.html',
        expected: 'https://website.com/about',
      },
      {
        input: 'https://website.com/about/default.aspx',
        expected: 'https://website.com/about',
      },
      {
        input: 'https://website.com/index.php',
        expected: 'https://website.com/',
      },
    ]

    for (const { input, expected } of testCases) {
      expect(normaliseInternalUrl(input)).toBe(expected)
    }
  })

  // Test trailing slashes
  it('should handle trailing slashes correctly', () => {
    const testCases = [
      {
        input: 'https://website.com/about/',
        expected: 'https://website.com/about',
      },
      {
        input: 'https://website.com/',
        expected: 'https://website.com/',
      },
      {
        input: 'https://website.com',
        expected: 'https://website.com/',
      },
    ]

    for (const { input, expected } of testCases) {
      expect(normaliseInternalUrl(input)).toBe(expected)
    }
  })

  // Test case normalization
  it('should normalize case to lowercase', () => {
    const testCases = [
      {
        input: 'https://website.com/ABOUT',
        expected: 'https://website.com/about',
      },
      {
        input: 'https://website.com/About/Team',
        expected: 'https://website.com/about/team',
      },
    ]

    for (const { input, expected } of testCases) {
      expect(normaliseInternalUrl(input)).toBe(expected)
    }
  })

  // Test URL parameters and fragments
  it('should remove URL parameters and fragments', () => {
    const testCases = [
      {
        input: 'https://website.com/about?lang=en',
        expected: 'https://website.com/about',
      },
      {
        input: 'https://website.com/products#section1',
        expected: 'https://website.com/products',
      },
      {
        input: 'https://website.com/contact?ref=home&lang=fr#contact-form',
        expected: 'https://website.com/contact',
      },
    ]

    for (const { input, expected } of testCases) {
      expect(normaliseInternalUrl(input)).toBe(expected)
    }
  })

  // Test combined cases
  it('should handle multiple normalizations at once', () => {
    const testCases = [
      {
        input: 'https://website.com/en-US/About/index.html?lang=en#top',
        expected: 'https://website.com/about',
      },
      {
        input: 'https://website.com/FR/Products/default.aspx?category=all/',
        expected: 'https://website.com/products',
      },
      // Add test for relative path with multiple normalizations
      {
        input: '/en-US/About/index.html?lang=en#top',
        expected: 'https://website.com/about',
      },
    ]

    for (const { input, expected } of testCases) {
      // For the last test case, we need to provide baseUrl
      const needsBaseUrl = input.startsWith('/')
      expect(
        normaliseInternalUrl(input, needsBaseUrl ? BASE_URL : undefined),
      ).toBe(expected)
    }
  })

  // Test invalid URLs
  it('should return null for invalid URLs', () => {
    const testCases = [
      'not-a-url',
      'http://',
      'https://',
      'ftp://website.com',
      'website.com',
    ]

    for (const input of testCases) {
      expect(normaliseInternalUrl(input)).toBeNull()
    }
  })

  // Test URLs with different protocols
  it('should preserve the protocol', () => {
    const testCases = [
      {
        input: 'http://website.com/about',
        expected: 'http://website.com/about',
      },
      {
        input: 'https://website.com/about',
        expected: 'https://website.com/about',
      },
    ]

    for (const { input, expected } of testCases) {
      expect(normaliseInternalUrl(input)).toBe(expected)
    }
  })
})
