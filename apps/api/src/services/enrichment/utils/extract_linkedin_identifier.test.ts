import { describe, expect, it } from 'vitest'
import {
  extractLinkedInIdentifier,
  isSuccessfulExtraction,
} from './extract_linkedin_identifier'

describe('extractLinkedInIdentifier', () => {
  describe('successful extractions', () => {
    it('should extract identifier from standard LinkedIn URL', () => {
      const result = extractLinkedInIdentifier(
        'https://www.linkedin.com/in/john-doe-123456/',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.identifier).toBe('john-doe-123456')
        expect(result.originalUrl).toBe(
          'https://www.linkedin.com/in/john-doe-123456/',
        )
      }
    })

    it('should extract identifier without www', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/in/jane-smith/',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.identifier).toBe('jane-smith')
      }
    })

    it('should extract identifier without trailing slash', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/in/bob-jones',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.identifier).toBe('bob-jones')
      }
    })

    it('should extract identifier with http protocol', () => {
      const result = extractLinkedInIdentifier(
        'http://www.linkedin.com/in/alice-williams/',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.identifier).toBe('alice-williams')
      }
    })

    it('should extract identifier with numbers', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/in/john-doe-12345678/',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.identifier).toBe('john-doe-12345678')
      }
    })

    it('should extract identifier with uppercase letters', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/in/John-Doe-MBA/',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.identifier).toBe('John-Doe-MBA')
      }
    })

    it('should extract short identifier (3 chars)', () => {
      const result = extractLinkedInIdentifier('https://linkedin.com/in/abc/')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.identifier).toBe('abc')
      }
    })

    it('should extract long identifier (100 chars)', () => {
      const longIdentifier = 'a'.repeat(100)
      const result = extractLinkedInIdentifier(
        `https://linkedin.com/in/${longIdentifier}/`,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.identifier).toBe(longIdentifier)
      }
    })

    it('should extract identifier from country-specific subdomain', () => {
      const result = extractLinkedInIdentifier(
        'https://fr.linkedin.com/in/alix-di-meglio/',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.identifier).toBe('alix-di-meglio')
        expect(result.originalUrl).toBe(
          'https://fr.linkedin.com/in/alix-di-meglio/',
        )
      }
    })

    it('should extract identifier from UK subdomain', () => {
      const result = extractLinkedInIdentifier(
        'https://uk.linkedin.com/in/john-doe/',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.identifier).toBe('john-doe')
      }
    })
  })

  describe('invalid URL format', () => {
    it('should reject malformed URL', () => {
      const result = extractLinkedInIdentifier('not-a-url')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid_url')
        expect(result.error.message).toContain('Failed to parse URL')
      }
    })

    it('should reject non-LinkedIn domain', () => {
      const result = extractLinkedInIdentifier(
        'https://twitter.com/in/john-doe/',
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid_url')
        expect(result.error.message).toContain('Invalid LinkedIn hostname')
      }
    })

    it('should reject LinkedIn URL with wrong subdomain', () => {
      const result = extractLinkedInIdentifier(
        'https://api.linkedin.com/in/john-doe/',
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid_url')
      }
    })
  })

  describe('invalid path format', () => {
    it('should reject URL with too short path', () => {
      const result = extractLinkedInIdentifier('https://linkedin.com/in/')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid_path')
        expect(result.error.message).toContain('URL path too short')
      }
    })

    it('should reject URL without path', () => {
      const result = extractLinkedInIdentifier('https://linkedin.com/')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid_path')
      }
    })
  })

  describe('unsupported profile types', () => {
    it('should reject company page URL', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/company/google/',
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('unsupported_profile_type')
        expect(result.error.message).toContain('Only personal profiles')
        if (result.error.type === 'unsupported_profile_type') {
          expect(result.error.profileType).toBe('company')
        }
      }
    })

    it('should reject school page URL', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/school/stanford-university/',
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('unsupported_profile_type')
        if (result.error.type === 'unsupported_profile_type') {
          expect(result.error.profileType).toBe('school')
        }
      }
    })

    it('should reject jobs URL', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/jobs/view/123456/',
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('unsupported_profile_type')
      }
    })
  })

  describe('invalid identifier format', () => {
    it('should reject identifier with special characters', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/in/john@doe/',
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid_identifier')
        expect(result.error.message).toContain('invalid characters')
      }
    })

    it('should reject identifier with spaces', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/in/john doe/',
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid_identifier')
      }
    })

    it('should reject identifier with underscores', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/in/john_doe/',
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid_identifier')
      }
    })

    it('should reject identifier with dots', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/in/john.doe/',
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid_identifier')
      }
    })

    it('should reject identifier too short (2 chars)', () => {
      const result = extractLinkedInIdentifier('https://linkedin.com/in/ab/')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid_identifier')
        expect(result.error.message).toContain('length out of range')
      }
    })

    it('should reject identifier too long (101 chars)', () => {
      const longIdentifier = 'a'.repeat(101)
      const result = extractLinkedInIdentifier(
        `https://linkedin.com/in/${longIdentifier}/`,
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid_identifier')
        expect(result.error.message).toContain('length out of range')
      }
    })
  })

  describe('isSuccessfulExtraction type guard', () => {
    it('should return true for successful extraction', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/in/john-doe/',
      )

      expect(isSuccessfulExtraction(result)).toBe(true)

      if (isSuccessfulExtraction(result)) {
        // TypeScript should narrow the type here
        expect(result.identifier).toBe('john-doe')
      }
    })

    it('should return false for failed extraction', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/company/x/',
      )

      expect(isSuccessfulExtraction(result)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should preserve original URL in result', () => {
      const originalUrl = 'https://linkedin.com/in/john-doe/'
      const result = extractLinkedInIdentifier(originalUrl)

      expect(result.originalUrl).toBe(originalUrl)
    })

    it('should handle URL with query parameters', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/in/john-doe/?trk=profile',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.identifier).toBe('john-doe')
      }
    })

    it('should handle URL with hash fragment', () => {
      const result = extractLinkedInIdentifier(
        'https://linkedin.com/in/john-doe/#experience',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.identifier).toBe('john-doe')
      }
    })

    it('should handle empty string', () => {
      const result = extractLinkedInIdentifier('')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('invalid_url')
      }
    })
  })
})
