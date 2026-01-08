import { describe, expect, it } from 'vitest'
import { normalizeFacebook } from '../normalize_facebook'

describe('normalizeFacebook', () => {
  // Valid profile URLs
  it('should normalize a valid Facebook profile URL', () => {
    const result = normalizeFacebook('https://www.facebook.com/username')
    expect(result).toEqual({
      username: 'username',
      url: 'https://www.facebook.com/username',
    })
  })

  it('should handle profile URLs without www', () => {
    const result = normalizeFacebook('https://facebook.com/username')
    expect(result).toEqual({
      username: 'username',
      url: 'https://www.facebook.com/username',
    })
  })

  it('should handle profile URLs with query parameters', () => {
    const result = normalizeFacebook(
      'https://facebook.com/username?ref=bookmarks',
    )
    expect(result).toEqual({
      username: 'username',
      url: 'https://www.facebook.com/username',
    })
  })

  it('should handle usernames with dots', () => {
    const result = normalizeFacebook('https://facebook.com/user.name')
    expect(result).toEqual({
      username: 'user.name',
      url: 'https://www.facebook.com/user.name',
    })
  })

  // Invalid URLs
  it('should return null for main Facebook domain', () => {
    expect(normalizeFacebook('https://facebook.com')).toBeNull()
    expect(normalizeFacebook('https://www.facebook.com')).toBeNull()
  })

  it('should return null for post URLs', () => {
    expect(normalizeFacebook('https://facebook.com/posts/123456')).toBeNull()
    expect(
      normalizeFacebook('https://www.facebook.com/posts/123456/'),
    ).toBeNull()
  })

  it('should return null for photos URLs', () => {
    expect(normalizeFacebook('https://facebook.com/photos/123456')).toBeNull()
  })

  it('should return null for pages URLs', () => {
    expect(normalizeFacebook('https://facebook.com/pages/pagename')).toBeNull()
  })

  it('should return null for groups URLs', () => {
    expect(
      normalizeFacebook('https://facebook.com/groups/groupname'),
    ).toBeNull()
  })

  it('should return null for events URLs', () => {
    expect(normalizeFacebook('https://facebook.com/events/123456')).toBeNull()
  })

  // New test cases for additional excluded paths
  it('should return null for profile.php URLs', () => {
    expect(
      normalizeFacebook('https://facebook.com/profile.php?id=123'),
    ).toBeNull()
  })

  it('should return null for sharer URLs', () => {
    expect(normalizeFacebook('https://facebook.com/sharer')).toBeNull()
    expect(normalizeFacebook('https://facebook.com/sharer.php')).toBeNull()
  })

  it('should return null for stories URLs', () => {
    expect(normalizeFacebook('https://facebook.com/stories/123456')).toBeNull()
  })

  it('should return null for photo.php URLs', () => {
    expect(
      normalizeFacebook('https://facebook.com/photo.php?id=123'),
    ).toBeNull()
  })

  it('should return null for ad campaign URLs', () => {
    expect(normalizeFacebook('https://facebook.com/ad_campaign/123')).toBeNull()
  })

  it('should return null for people URLs', () => {
    expect(normalizeFacebook('https://facebook.com/people/username')).toBeNull()
  })

  it('should return null for pg URLs', () => {
    expect(normalizeFacebook('https://facebook.com/pg/pagename')).toBeNull()
  })

  it('should return null for invalid usernames', () => {
    expect(normalizeFacebook('https://facebook.com/posts')).toBeNull()
    expect(normalizeFacebook('https://facebook.com/photos')).toBeNull()
    expect(normalizeFacebook('https://facebook.com/p/pagename')).toBeNull()
    expect(normalizeFacebook('https://facebook.com/pages')).toBeNull()
    expect(normalizeFacebook('https://facebook.com/groups')).toBeNull()
    expect(normalizeFacebook('https://facebook.com/events')).toBeNull()
    expect(normalizeFacebook('https://facebook.com/')).toBeNull()
  })

  // Edge cases
  it('should return null for non-Facebook URLs', () => {
    expect(normalizeFacebook('https://instagram.com/username')).toBeNull()
  })

  it('should return null for undefined or null input', () => {
    expect(normalizeFacebook(undefined as unknown as string)).toBeNull()
    expect(normalizeFacebook(null as unknown as string)).toBeNull()
  })

  it('should handle URLs with mixed case', () => {
    const result = normalizeFacebook('https://FaceBook.com/UserName')
    expect(result).toEqual({
      username: 'UserName',
      url: 'https://www.facebook.com/UserName',
    })
  })
})
