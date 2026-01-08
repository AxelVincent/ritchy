import { describe, expect, it } from 'vitest'
import type { CachedPattern } from '../pattern_cache'
import { matchPatternsInMemory } from '../pattern_matcher_utils'

describe('pattern_cache', () => {
  describe('matchPatternsInMemory', () => {
    const mockPatterns: CachedPattern[] = [
      {
        id: '1',
        technology: 'google analytics',
        category: 'analytics',
        pattern: 'google-analytics.com/analytics.js',
        patternType: 'script_url',
        confirmedCount: 10,
      },
      {
        id: '2',
        technology: 'segment',
        category: 'analytics',
        pattern: 'cdn.segment.com',
        patternType: 'script_url',
        confirmedCount: 5,
      },
      {
        id: '3',
        technology: 'intercom',
        category: 'sales',
        pattern: "intercom('boot'",
        patternType: 'inline_code',
        confirmedCount: 3,
      },
      {
        id: '4',
        technology: 'wordpress',
        category: 'cms',
        pattern: 'generator:wordpress',
        patternType: 'meta_tag',
        confirmedCount: 20,
      },
    ]

    it('should match script URLs against patterns', () => {
      const scripts = [
        {
          type: 'script_url',
          value: 'https://www.google-analytics.com/analytics.js',
        },
        {
          type: 'script_url',
          value: 'https://cdn.segment.com/analytics.js/v1/123.js',
        },
      ]

      const { matched, matchedScriptIndices } = matchPatternsInMemory(
        scripts,
        mockPatterns,
      )

      expect(matched).toHaveLength(2)
      expect(matched[0].technology).toBe('google analytics')
      expect(matched[0].category).toBe('analytics')
      expect(matched[0].confidence).toBeGreaterThan(60)
      expect(matched[1].technology).toBe('segment')
      expect(matchedScriptIndices.size).toBe(2)
      expect(matchedScriptIndices.has(0)).toBe(true)
      expect(matchedScriptIndices.has(1)).toBe(true)
    })

    it('should match inline code against patterns', () => {
      const scripts = [
        {
          type: 'inline_code',
          value: "window.Intercom('boot', {app_id: 'abc123'});",
        },
      ]

      const { matched, matchedScriptIndices } = matchPatternsInMemory(
        scripts,
        mockPatterns,
      )

      expect(matched).toHaveLength(1)
      expect(matched[0].technology).toBe('intercom')
      expect(matched[0].category).toBe('sales')
      expect(matchedScriptIndices.size).toBe(1)
    })

    it('should match meta tags against patterns', () => {
      const scripts = [
        {
          type: 'meta_tag',
          value: 'generator:WordPress 6.0',
        },
      ]

      const { matched, matchedScriptIndices } = matchPatternsInMemory(
        scripts,
        mockPatterns,
      )

      expect(matched).toHaveLength(1)
      expect(matched[0].technology).toBe('wordpress')
      expect(matched[0].category).toBe('cms')
      expect(matchedScriptIndices.size).toBe(1)
    })

    it('should be case-insensitive when matching', () => {
      const scripts = [
        {
          type: 'script_url',
          value: 'https://WWW.GOOGLE-ANALYTICS.COM/analytics.js',
        },
        {
          type: 'meta_tag',
          value: 'GENERATOR:WORDPRESS',
        },
      ]

      const { matched } = matchPatternsInMemory(scripts, mockPatterns)

      expect(matched).toHaveLength(2)
      expect(matched[0].technology).toBe('google analytics')
      expect(matched[1].technology).toBe('wordpress')
    })

    it('should handle multiple patterns matching the same technology', () => {
      const patternsWithDuplicates: CachedPattern[] = [
        {
          id: '1',
          technology: 'wordpress',
          category: 'cms',
          pattern: 'wp-content',
          patternType: 'script_url',
          confirmedCount: 5,
        },
        {
          id: '2',
          technology: 'wordpress',
          category: 'cms',
          pattern: 'wp-includes',
          patternType: 'script_url',
          confirmedCount: 10, // Higher confidence
        },
      ]

      const scripts = [
        {
          type: 'script_url',
          value: 'https://example.com/wp-content/themes/theme.js',
        },
        {
          type: 'script_url',
          value: 'https://example.com/wp-includes/js/script.js',
        },
      ]

      const { matched } = matchPatternsInMemory(scripts, patternsWithDuplicates)

      // Should only return one WordPress entry with higher confidence
      expect(matched).toHaveLength(1)
      expect(matched[0].technology).toBe('wordpress')
      expect(matched[0].confidence).toBe(90) // 60 + 10*3 = 90
    })

    it('should calculate confidence based on confirmedCount', () => {
      const scripts = [
        {
          type: 'script_url',
          value: 'https://www.google-analytics.com/analytics.js',
        },
      ]

      const { matched } = matchPatternsInMemory(scripts, mockPatterns)

      // Google Analytics has confirmedCount=10
      // Confidence = min(95, 60 + 10*3) = min(95, 90) = 90
      expect(matched[0].confidence).toBe(90)
    })

    it('should cap confidence at 95', () => {
      const highConfidencePattern: CachedPattern[] = [
        {
          id: '1',
          technology: 'stripe',
          category: 'ecommerce',
          pattern: 'stripe.com',
          patternType: 'script_url',
          confirmedCount: 50, // Would be 60 + 50*3 = 210, but capped at 95
        },
      ]

      const scripts = [
        {
          type: 'script_url',
          value: 'https://js.stripe.com/v3/',
        },
      ]

      const { matched } = matchPatternsInMemory(scripts, highConfidencePattern)

      expect(matched[0].confidence).toBe(95)
    })

    it('should truncate evidence to 200 characters', () => {
      const longScript = 'a'.repeat(500)
      const scripts = [
        {
          type: 'script_url',
          value: `https://www.google-analytics.com/analytics.js?${longScript}`,
        },
      ]

      const { matched } = matchPatternsInMemory(scripts, mockPatterns)

      expect(matched[0].evidence).toHaveLength(200)
    })

    it('should return empty results when no patterns match', () => {
      const scripts = [
        {
          type: 'script_url',
          value: 'https://example.com/unknown-script.js',
        },
      ]

      const { matched, matchedScriptIndices } = matchPatternsInMemory(
        scripts,
        mockPatterns,
      )

      expect(matched).toHaveLength(0)
      expect(matchedScriptIndices.size).toBe(0)
    })

    it('should handle empty scripts array', () => {
      const { matched, matchedScriptIndices } = matchPatternsInMemory(
        [],
        mockPatterns,
      )

      expect(matched).toHaveLength(0)
      expect(matchedScriptIndices.size).toBe(0)
    })

    it('should handle empty patterns array', () => {
      const scripts = [
        {
          type: 'script_url',
          value: 'https://example.com/script.js',
        },
      ]

      const { matched, matchedScriptIndices } = matchPatternsInMemory(
        scripts,
        [],
      )

      expect(matched).toHaveLength(0)
      expect(matchedScriptIndices.size).toBe(0)
    })

    it('should normalize technology names to lowercase', () => {
      const mixedCasePattern: CachedPattern[] = [
        {
          id: '1',
          technology: 'WordPress',
          category: 'cms',
          pattern: 'wp-content',
          patternType: 'script_url',
          confirmedCount: 5,
        },
      ]

      const scripts = [
        {
          type: 'script_url',
          value: 'https://example.com/wp-content/script.js',
        },
      ]

      const { matched } = matchPatternsInMemory(scripts, mixedCasePattern)

      // Should normalize to lowercase
      expect(matched[0].technology).toBe('wordpress')
    })

    it('should match partial patterns in longer strings', () => {
      const scripts = [
        {
          type: 'script_url',
          value:
            'https://www.googletagmanager.com/gtag/js?id=UA-123456-1&l=dataLayer&cx=c',
        },
      ]

      const partialPattern: CachedPattern[] = [
        {
          id: '1',
          technology: 'google tag manager',
          category: 'marketing',
          pattern: 'googletagmanager.com',
          patternType: 'script_url',
          confirmedCount: 8,
        },
      ]

      const { matched } = matchPatternsInMemory(scripts, partialPattern)

      expect(matched).toHaveLength(1)
      expect(matched[0].technology).toBe('google tag manager')
    })

    it('should track which script indices were matched', () => {
      const scripts = [
        {
          type: 'script_url',
          value: 'https://www.google-analytics.com/analytics.js',
        },
        {
          type: 'script_url',
          value: 'https://unknown.com/script.js',
        },
        {
          type: 'script_url',
          value: 'https://cdn.segment.com/analytics.js',
        },
        {
          type: 'script_url',
          value: 'https://another-unknown.com/app.js',
        },
      ]

      const { matchedScriptIndices } = matchPatternsInMemory(
        scripts,
        mockPatterns,
      )

      expect(matchedScriptIndices.size).toBe(2)
      expect(matchedScriptIndices.has(0)).toBe(true) // Google Analytics
      expect(matchedScriptIndices.has(1)).toBe(false) // Unknown
      expect(matchedScriptIndices.has(2)).toBe(true) // Segment
      expect(matchedScriptIndices.has(3)).toBe(false) // Unknown
    })

    it('should return pattern ID for matched technologies', () => {
      const scripts = [
        {
          type: 'script_url',
          value: 'https://www.google-analytics.com/analytics.js',
        },
      ]

      const { matched } = matchPatternsInMemory(scripts, mockPatterns)

      expect(matched[0].patternId).toBe('1')
    })
  })
})
