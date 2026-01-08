import { describe, expect, it } from 'vitest'
import { getMainDomain } from '../get_main_domain'

describe('getMainDomain', () => {
  it('should extract main domain from simple URL', () => {
    expect(getMainDomain('https://example.com')).toBe('example.com')
  })

  it('should extract main domain from URL with subdomain', () => {
    expect(getMainDomain('https://blog.example.com')).toBe('example.com')
    expect(getMainDomain('https://sub1.sub2.example.com')).toBe('example.com')
  })

  it('should extract main domain from URL with path and query parameters', () => {
    expect(getMainDomain('https://example.com/path?query=value')).toBe(
      'example.com',
    )
  })

  it('should handle special TLD domains correctly', () => {
    expect(getMainDomain('https://example.co.uk')).toBe('example.co.uk')
    expect(getMainDomain('https://blog.example.co.uk')).toBe('example.co.uk')
    expect(getMainDomain('https://example.com.au')).toBe('example.com.au')
    expect(getMainDomain('https://sub.example.com.au')).toBe('example.com.au')
  })

  it('should handle international domains', () => {
    expect(getMainDomain('https://bücher.example')).toBe('bücher.example')
    expect(getMainDomain('https://xn--bcher-kva.example')).toBe(
      'xn--bcher-kva.example',
    )
  })

  it('should throw error for invalid URLs', () => {
    expect(() => getMainDomain('invalid-url')).toThrow()
    expect(() => getMainDomain('')).toThrow()
  })
})
