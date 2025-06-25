import { describe, expect, it } from 'vitest'
import { extractSocialPlatformFromUrl } from '../extract_social_platform_from_url'

describe('extractSocialPlatformFromUrl', () => {
  describe('valid social media URLs', () => {
    it('should extract facebook platform from direct domain', () => {
      const url = 'https://facebook.com/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })

    it('should extract facebook platform from www subdomain', () => {
      const url = 'https://www.facebook.com/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })

    it('should extract twitter platform from direct domain', () => {
      const url = 'https://twitter.com/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('twitter')
    })

    it('should extract linkedin platform from direct domain', () => {
      const url = 'https://linkedin.com/in/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('linkedin')
    })

    it('should extract instagram platform from direct domain', () => {
      const url = 'https://instagram.com/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('instagram')
    })

    it('should extract youtube platform from direct domain', () => {
      const url = 'https://youtube.com/@johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('youtube')
    })

    it('should extract tiktok platform from direct domain', () => {
      const url = 'https://tiktok.com/@johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('tiktok')
    })

    it('should extract pinterest platform from direct domain', () => {
      const url = 'https://pinterest.com/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('pinterest')
    })

    it('should extract reddit platform from direct domain', () => {
      const url = 'https://reddit.com/user/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('reddit')
    })

    it('should extract snapchat platform from direct domain', () => {
      const url = 'https://snapchat.com/add/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('snapchat')
    })
  })

  describe('case insensitive handling', () => {
    it('should handle uppercase domains', () => {
      const url = 'https://FACEBOOK.COM/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })

    it('should handle mixed case domains', () => {
      const url = 'https://FaceBook.com/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })
  })

  describe('subdomain handling', () => {
    it('should extract platform from subdomain using domain extraction', () => {
      const url = 'https://m.facebook.com/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })

    it('should extract platform from multiple subdomains', () => {
      const url = 'https://mobile.app.facebook.com/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })

    it('should extract platform from country-specific subdomains', () => {
      const url = 'https://uk.linkedin.com/in/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('linkedin')
    })
  })

  describe('protocol variations', () => {
    it('should handle http protocol', () => {
      const url = 'http://facebook.com/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })

    it('should handle https protocol', () => {
      const url = 'https://facebook.com/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })
  })

  describe('edge cases and invalid inputs', () => {
    it('should return unknown for non-social media domains', () => {
      const url = 'https://google.com/search'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('unknown')
    })

    it('should return unknown for invalid URLs', () => {
      const url = 'not-a-valid-url'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('unknown')
    })

    it('should return unknown for empty string', () => {
      const url = ''
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('unknown')
    })

    it('should return unknown for null-like values', () => {
      const url = 'null'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('unknown')
    })

    it('should return unknown for URLs without protocol', () => {
      const url = 'facebook.com/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('unknown')
    })

    it('should return unknown for malformed URLs', () => {
      const url = 'https://'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('unknown')
    })

    it('should handle URLs with script tags in path (XSS attempt)', () => {
      const url = 'https://facebook.com/johndoe<script>alert("xss")</script>'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })
  })

  describe('complex URL structures', () => {
    it('should handle URLs with query parameters', () => {
      const url = 'https://facebook.com/johndoe?ref=profile&utm_source=email'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })

    it('should handle URLs with fragments', () => {
      const url = 'https://facebook.com/johndoe#profile-section'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })

    it('should handle URLs with ports', () => {
      const url = 'https://facebook.com:443/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })

    it('should handle URLs with complex paths', () => {
      const url = 'https://facebook.com/profile.php?id=123456789&ref=profile'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })
  })

  describe('domain extraction fallback', () => {
    it('should use domain extraction when hostname is not in config', () => {
      const url = 'https://m.facebook.com/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })

    it('should handle domains with multiple dots correctly', () => {
      const url = 'https://mobile.app.facebook.com/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('facebook')
    })

    it('should handle country-specific domains', () => {
      const url = 'https://uk.linkedin.com/in/johndoe'
      const result = extractSocialPlatformFromUrl(url)
      expect(result).toBe('linkedin')
    })
  })
})
