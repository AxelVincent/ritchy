import { describe, expect, it } from 'vitest'
import { normalizeInstagram } from '../normalize_instagram'

describe('normalizeInstagram', () => {
  // Valid profile URLs
  it('should normalize a valid Instagram profile URL', () => {
    const result = normalizeInstagram('https://www.instagram.com/username')
    expect(result).toEqual({
      username: 'username',
      url: 'https://www.instagram.com/username',
    })
  })

  it('should handle profile URLs without www', () => {
    const result = normalizeInstagram('https://instagram.com/username')
    expect(result).toEqual({
      username: 'username',
      url: 'https://www.instagram.com/username',
    })
  })

  it('should handle profile URLs with _u prefix', () => {
    const result = normalizeInstagram('https://instagram.com/_u/username')
    expect(result).toEqual({
      username: 'username',
      url: 'https://www.instagram.com/username',
    })
  })

  it('should handle profile URLs with query parameters', () => {
    const result = normalizeInstagram('https://instagram.com/username?hl=en')
    expect(result).toEqual({
      username: 'username',
      url: 'https://www.instagram.com/username',
    })
  })

  // Invalid URLs
  it('should return null for main Instagram domain', () => {
    expect(normalizeInstagram('https://instagram.com')).toBeNull()
    expect(normalizeInstagram('https://www.instagram.com')).toBeNull()
  })

  it('should return null for post URLs', () => {
    expect(normalizeInstagram('https://instagram.com/p/abc123')).toBeNull()
    expect(normalizeInstagram('https://www.instagram.com/p/abc123/')).toBeNull()
  })

  it('should return null for reel URLs', () => {
    expect(normalizeInstagram('https://instagram.com/reel/xyz789')).toBeNull()
    expect(
      normalizeInstagram('https://www.instagram.com/reel/xyz789/'),
    ).toBeNull()
  })

  it('should return null for invalid usernames', () => {
    expect(normalizeInstagram('https://instagram.com/p')).toBeNull()
    expect(normalizeInstagram('https://instagram.com/reel')).toBeNull()
    expect(normalizeInstagram('https://instagram.com/')).toBeNull()
  })

  // Edge cases
  it('should return null for non-Instagram URLs', () => {
    expect(normalizeInstagram('https://facebook.com/username')).toBeNull()
  })

  it('should return null for undefined or null input', () => {
    expect(normalizeInstagram(undefined as unknown as string)).toBeNull()
    expect(normalizeInstagram(null as unknown as string)).toBeNull()
  })

  it('should handle URLs with mixed case', () => {
    const result = normalizeInstagram('https://InstaGram.com/UserName')
    expect(result).toEqual({
      username: 'UserName',
      url: 'https://www.instagram.com/UserName',
    })
  })
})
