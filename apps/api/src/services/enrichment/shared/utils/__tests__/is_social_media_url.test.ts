import { describe, expect, test } from 'vitest'
import { SOCIAL_MEDIA_DOMAINS } from '../../../../../shared'
import { isSocialMediaUrl } from '../is_social_media_url'

describe('isSocialMediaUrl', () => {
  test.each(SOCIAL_MEDIA_DOMAINS)(
    'should return true for exact social media url: %s',
    (domain) => {
      expect(isSocialMediaUrl(domain)).toBe(true)
    },
  )

  test.each([
    'business.facebook.com',
    'developer.linkedin.com',
    'about.instagram.com',
  ])('should return true for subdomain: %s', (domain) => {
    expect(isSocialMediaUrl(domain)).toBe(true)
  })

  test.each([
    'example.com',
    'google.com',
    'twitter.com',
    'youtube.com',
    'tiktok.com',
    'myfacebook.com',
    'facebook.fake.com',
    'notreal.com',
    '',
  ])('should return false for non-social media domain: %s', (domain) => {
    expect(isSocialMediaUrl(domain)).toBe(false)
  })

  test.each([
    'FACEBOOK.COM',
    'Facebook.com',
    'FaCeBoOk.CoM',
    'LINKEDIN.COM',
    'LinkedIn.com',
    'INSTAGRAM.COM',
    'Instagram.com',
  ])('should handle different cases correctly for: %s', (domain) => {
    expect(isSocialMediaUrl(domain)).toBe(true)
  })

  // New test cases for full URLs
  test.each([
    'https://www.facebook.com/profile',
    'http://linkedin.com/in/username',
    'https://instagram.com/aafitness.club/',
    'https://business.facebook.com/pages/123',
    'https://www.linkedin.com/company/microsoft',
    'https://www.instagram.com/explore/tags/fitness',
  ])('should handle full URLs correctly: %s', (url) => {
    expect(isSocialMediaUrl(url)).toBe(true)
  })

  // Test invalid URLs
  test.each([
    'not-a-url',
    'http://',
    'https://',
    'http://invalid',
    'https:///instagram.com',
  ])('should handle invalid URLs gracefully: %s', (invalidUrl) => {
    expect(isSocialMediaUrl(invalidUrl)).toBe(false)
  })
})
