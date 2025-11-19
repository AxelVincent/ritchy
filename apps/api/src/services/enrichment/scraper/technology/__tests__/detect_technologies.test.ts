import { describe, expect, it } from 'vitest'
import { deduplicateTechnologies } from '../detect_technologies_utils'
import type { DetectedTechnology } from '../types'

describe('detect_technologies', () => {
  describe('deduplicateTechnologies', () => {
    it('should remove exact duplicate technologies', () => {
      const technologies: DetectedTechnology[] = [
        {
          technology: 'google analytics',
          category: 'analytics',
          confidence: 90,
          evidence: 'https://google-analytics.com/analytics.js',
          detectionMethod: 'pattern',
        },
        {
          technology: 'google analytics',
          category: 'analytics',
          confidence: 85,
          evidence: 'ga.js',
          detectionMethod: 'pattern',
        },
      ]

      const { unique, duplicates } = deduplicateTechnologies(technologies)

      expect(unique).toHaveLength(1)
      expect(unique[0].technology).toBe('google analytics')
      expect(unique[0].confidence).toBe(90) // Keeps higher confidence
      expect(duplicates).toHaveLength(0) // Same casing, no warning needed
    })

    it('should remove case-variant duplicates and keep higher confidence', () => {
      const technologies: DetectedTechnology[] = [
        {
          technology: 'WordPress',
          category: 'cms',
          confidence: 80,
          evidence: 'wp-content',
          detectionMethod: 'pattern',
        },
        {
          technology: 'wordpress',
          category: 'cms',
          confidence: 90,
          evidence: 'wp-includes',
          detectionMethod: 'llm',
        },
      ]

      const { unique, duplicates } = deduplicateTechnologies(technologies)

      expect(unique).toHaveLength(1)
      expect(unique[0].technology).toBe('wordpress') // Higher confidence wins
      expect(unique[0].confidence).toBe(90)
      expect(duplicates).toHaveLength(1)
      expect(duplicates[0]).toContain('WordPress')
      expect(duplicates[0]).toContain('wordpress')
      expect(duplicates[0]).toContain('kept: wordpress')
    })

    it('should keep first occurrence when confidence is equal', () => {
      const technologies: DetectedTechnology[] = [
        {
          technology: 'Stripe',
          category: 'ecommerce',
          confidence: 85,
          evidence: 'stripe.com',
          detectionMethod: 'pattern',
        },
        {
          technology: 'stripe',
          category: 'ecommerce',
          confidence: 85,
          evidence: 'Stripe.js',
          detectionMethod: 'llm',
        },
      ]

      const { unique, duplicates } = deduplicateTechnologies(technologies)

      expect(unique).toHaveLength(1)
      expect(unique[0].technology).toBe('Stripe') // First occurrence kept
      expect(duplicates).toHaveLength(1)
    })

    it('should handle multiple case variations', () => {
      const technologies: DetectedTechnology[] = [
        {
          technology: 'WordPress',
          category: 'cms',
          confidence: 70,
          evidence: 'test1',
          detectionMethod: 'pattern',
        },
        {
          technology: 'wordpress',
          category: 'cms',
          confidence: 80,
          evidence: 'test2',
          detectionMethod: 'pattern',
        },
        {
          technology: 'WORDPRESS',
          category: 'cms',
          confidence: 90,
          evidence: 'test3',
          detectionMethod: 'llm',
        },
      ]

      const { unique, duplicates } = deduplicateTechnologies(technologies)

      expect(unique).toHaveLength(1)
      expect(unique[0].technology).toBe('WORDPRESS') // Highest confidence
      expect(unique[0].confidence).toBe(90)
      expect(duplicates).toHaveLength(2) // Two replacements logged
    })

    it('should preserve different technologies', () => {
      const technologies: DetectedTechnology[] = [
        {
          technology: 'google analytics',
          category: 'analytics',
          confidence: 90,
          evidence: 'ga.js',
          detectionMethod: 'pattern',
        },
        {
          technology: 'segment',
          category: 'analytics',
          confidence: 85,
          evidence: 'segment.com',
          detectionMethod: 'pattern',
        },
        {
          technology: 'intercom',
          category: 'sales',
          confidence: 80,
          evidence: 'intercom.js',
          detectionMethod: 'llm',
        },
      ]

      const { unique, duplicates } = deduplicateTechnologies(technologies)

      expect(unique).toHaveLength(3)
      expect(duplicates).toHaveLength(0)
    })

    it('should handle empty array', () => {
      const { unique, duplicates } = deduplicateTechnologies([])

      expect(unique).toHaveLength(0)
      expect(duplicates).toHaveLength(0)
    })

    it('should handle single technology', () => {
      const technologies: DetectedTechnology[] = [
        {
          technology: 'shopify',
          category: 'ecommerce',
          confidence: 95,
          evidence: 'shopify.com',
          detectionMethod: 'pattern',
        },
      ]

      const { unique, duplicates } = deduplicateTechnologies(technologies)

      expect(unique).toHaveLength(1)
      expect(unique[0]).toEqual(technologies[0])
      expect(duplicates).toHaveLength(0)
    })

    it('should preserve all properties of winning technology', () => {
      const technologies: DetectedTechnology[] = [
        {
          technology: 'Stripe',
          category: 'ecommerce',
          confidence: 70,
          evidence: 'old evidence',
          detectionMethod: 'pattern',
          patternId: 'pattern-1',
        },
        {
          technology: 'stripe',
          category: 'ecommerce',
          confidence: 90,
          evidence: 'new evidence',
          detectionMethod: 'llm',
        },
      ]

      const { unique } = deduplicateTechnologies(technologies)

      expect(unique[0]).toEqual({
        technology: 'stripe',
        category: 'ecommerce',
        confidence: 90,
        evidence: 'new evidence',
        detectionMethod: 'llm',
      })
    })

    it('should log duplicate information correctly', () => {
      const technologies: DetectedTechnology[] = [
        {
          technology: 'Intercom',
          category: 'sales',
          confidence: 75,
          evidence: 'test',
          detectionMethod: 'pattern',
        },
        {
          technology: 'intercom',
          category: 'sales',
          confidence: 85,
          evidence: 'test',
          detectionMethod: 'llm',
        },
      ]

      const { duplicates } = deduplicateTechnologies(technologies)

      expect(duplicates[0]).toBe('Intercom vs intercom (kept: intercom)')
    })
  })
})
