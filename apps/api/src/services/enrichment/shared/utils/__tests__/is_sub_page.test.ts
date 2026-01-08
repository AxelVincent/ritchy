import { describe, expect, it } from 'vitest'
import { isSubPage } from '../is_sub_page'

describe('isSubPage', () => {
  it('should return true for URLs containing forward slashes', () => {
    const testCases = [
      'example.com/path',
      'example.com/path/subpath',
      'https://example.com/path',
      'http://example.com/path/to/page',
      '/relative/path',
      'subdomain.example.com/path',
    ]

    for (const url of testCases) {
      expect(isSubPage(url)).toBe(true)
    }
  })

  it('should return false for URLs without forward slashes', () => {
    const testCases = [
      'example.com',
      'subdomain.example.com',
      'localhost',
      'test.local',
      'internalsite',
    ]

    for (const url of testCases) {
      expect(isSubPage(url)).toBe(false)
    }
  })

  it('should handle empty strings', () => {
    expect(isSubPage('')).toBe(false)
  })
})
