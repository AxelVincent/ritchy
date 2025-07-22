import { describe, expect, it } from 'vitest'
import { normalizeInstagram } from '../normalize_instagram'

describe('normalizeInstagram', () => {
  it('should normalize username and return clean URL from basic instagram profile URL', () => {
    const input = 'https://www.instagram.com/username'
    expect(normalizeInstagram(input)).toEqual({
      username: 'username',
      url: 'https://www.instagram.com/username'
    })
  })

  it('should normalize username and return clean URL from URL with trailing slash', () => {
    const input = 'https://www.instagram.com/username/'
    expect(normalizeInstagram(input)).toEqual({
      username: 'username',
      url: 'https://www.instagram.com/username'
    })
  })

  it('should normalize username and return clean URL from URL with query parameters', () => {
    const input = 'https://www.instagram.com/username?hl=en'
    expect(normalizeInstagram(input)).toEqual({
      username: 'username',
      url: 'https://www.instagram.com/username'
    })
  })

  it('should normalize username and return clean URL from URL with _u prefix', () => {
    const input = 'https://www.instagram.com/_u/username'
    expect(normalizeInstagram(input)).toEqual({
      username: 'username',
      url: 'https://www.instagram.com/username'
    })
  })

  it('should normalize username and return clean URL from URL with fragments', () => {
    const input = 'https://www.instagram.com/username#highlights'
    expect(normalizeInstagram(input)).toEqual({
      username: 'username',
      url: 'https://www.instagram.com/username'
    })
  })

  it('should handle undefined input', () => {
    const input = undefined
    expect(normalizeInstagram(input as unknown as string)).toBeNull()
  })

  it('should return null for non-instagram URLs', () => {
    const input = 'https://example.com/username'
    expect(normalizeInstagram(input)).toBeNull()
  })
})
