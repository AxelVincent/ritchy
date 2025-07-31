import { describe, expect, it } from 'vitest'
import { cleanUrl } from '../clean_url'

describe('cleanUrl', () => {
  // Test root path handling
  it('should preserve trailing slash for root paths', () => {
    const testCases = [
      {
        input: '/',
        expected: '/',
      },
      {
        input: 'https://example.com/',
        expected: 'https://example.com/',
      },
      {
        input: 'http://localhost:3000/',
        expected: 'http://localhost:3000/',
      },
    ]

    for (const { input, expected } of testCases) {
      expect(cleanUrl(input)).toBe(expected)
    }
  })

  // Test relative paths
  it('should handle relative paths correctly', () => {
    const testCases = [
      {
        input: '/about',
        expected: '/about',
      },
      {
        input: '/contact/',
        expected: '/contact',
      },
      {
        input: '/products/item/',
        expected: '/products/item',
      },
      {
        input: '/en/about/',
        expected: '/en/about',
      },
    ]

    for (const { input, expected } of testCases) {
      expect(cleanUrl(input)).toBe(expected)
    }
  })

  it('should remove hash fragments from URLs', () => {
    const input = 'https://example.com/page#section'
    const expected = 'https://example.com/page'
    expect(cleanUrl(input)).toBe(expected)
  })

  it('should remove trailing slashes from non-root paths', () => {
    const testCases = [
      {
        input: 'https://example.com/page/',
        expected: 'https://example.com/page',
      },
      {
        input: 'https://example.com/about/team/',
        expected: 'https://example.com/about/team',
      },
    ]

    for (const { input, expected } of testCases) {
      expect(cleanUrl(input)).toBe(expected)
    }
  })

  it('should handle URLs with both hash and trailing slash', () => {
    const input = 'https://example.com/page/#section'
    const expected = 'https://example.com/page'
    expect(cleanUrl(input)).toBe(expected)
  })

  it('should preserve query parameters', () => {
    const input = 'https://example.com/page?param=value#section'
    const expected = 'https://example.com/page?param=value'
    expect(cleanUrl(input)).toBe(expected)
  })

  it('should preserve path segments', () => {
    const input = 'https://example.com/path/to/page#section'
    const expected = 'https://example.com/path/to/page'
    expect(cleanUrl(input)).toBe(expected)
  })

  it('should return original string for invalid URLs', () => {
    const invalidUrls = [
      'not-a-url',
      'http://',
      'https://',
      'javascript:void(0)',
      '',
      '#',
      'about', // relative path without leading slash should be preserved
      'contact/us', // relative path without leading slash should be preserved
    ]

    for (const url of invalidUrls) {
      expect(cleanUrl(url)).toBe(url)
    }
  })

  it('should handle URLs with ports', () => {
    const input = 'http://localhost:3000/page/#section'
    const expected = 'http://localhost:3000/page'
    expect(cleanUrl(input)).toBe(expected)
  })

  it('should preserve URL encoded characters', () => {
    const input = 'https://example.com/path%20with%20spaces#section'
    const expected = 'https://example.com/path%20with%20spaces'
    expect(cleanUrl(input)).toBe(expected)
  })

  it('should handle URLs with authentication', () => {
    const input = 'https://user:pass@example.com/page#section'
    const expected = 'https://user:pass@example.com/page'
    expect(cleanUrl(input)).toBe(expected)
  })

  it('should handle URLs with multiple hash fragments', () => {
    const input = 'https://example.com/page#section#another'
    const expected = 'https://example.com/page'
    expect(cleanUrl(input)).toBe(expected)
  })
})
