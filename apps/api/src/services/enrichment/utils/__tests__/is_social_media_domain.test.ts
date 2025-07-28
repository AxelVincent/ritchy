import { SocialMediaPlatformEnum } from '@ritchy/types'
import { describe, expect, test } from 'vitest'
import { isSocialMediaDomain } from '../is_social_media_domain'

describe('isSocialMediaDomain', () => {
  test.each(Object.values(SocialMediaPlatformEnum.Enum))(
    'should return true for exact social media domain: %s',
    (domain) => {
      expect(isSocialMediaDomain(domain)).toBe(true)
    },
  )

  test.each(['business.facebook', 'developer.linkedin', 'about.instagram'])(
    'should return true for subdomain: %s',
    (domain) => {
      expect(isSocialMediaDomain(domain)).toBe(true)
    },
  )

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
    expect(isSocialMediaDomain(domain)).toBe(false)
  })

  test.each([
    'FACEBOOK',
    'Facebook',
    'FaCeBoOk',
    'LINKEDIN',
    'LinkedIn',
    'INSTAGRAM',
    'Instagram',
  ])('should handle different cases correctly for: %s', (domain) => {
    expect(isSocialMediaDomain(domain)).toBe(true)
  })
})
