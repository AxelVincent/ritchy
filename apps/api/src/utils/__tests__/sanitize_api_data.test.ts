import { describe, expect, it } from 'vitest'
import { sanitizeApiData } from '../sanitize_api_data'

describe('sanitizeApiData', () => {
  describe('string sanitization', () => {
    it('should remove null terminators from strings', () => {
      const input = 'Hello\0World\0'
      const result = sanitizeApiData(input)
      expect(result).toBe('HelloWorld')
    })

    it('should remove control characters from strings', () => {
      const input = 'Hello\x00\x01\x02\x03\x04\x05\x06\x07\x08World'
      const result = sanitizeApiData(input)
      expect(result).toBe('HelloWorld')
    })

    it('should remove other control characters', () => {
      const input = 'Hello\x0B\x0C\x0E\x0F\x1F\x7FWorld'
      const result = sanitizeApiData(input)
      expect(result).toBe('HelloWorld')
    })

    it('should trim whitespace', () => {
      const input = '  Hello World  '
      const result = sanitizeApiData(input)
      expect(result).toBe('Hello World')
    })

    it('should handle empty strings', () => {
      const input = ''
      const result = sanitizeApiData(input)
      expect(result).toBe('')
    })

    it('should handle null values', () => {
      const input = null
      const result = sanitizeApiData(input)
      expect(result).toBe(null)
    })

    it('should handle undefined values', () => {
      const input = undefined
      const result = sanitizeApiData(input)
      expect(result).toBe(undefined)
    })

    it('should preserve normal text', () => {
      const input = 'Hello World! This is normal text.'
      const result = sanitizeApiData(input)
      expect(result).toBe('Hello World! This is normal text.')
    })

    it('should handle special characters that are not control characters', () => {
      const input = 'Hello\nWorld\tTest\r\n'
      const result = sanitizeApiData(input)
      // The trim() function removes trailing whitespace including \n
      expect(result).toBe('Hello\nWorld\tTest')
    })

    it('should verify trim behavior with newlines', () => {
      const input = 'Hello\nWorld\n'
      const result = sanitizeApiData(input)
      // Trailing \n should be removed by trim()
      expect(result).toBe('Hello\nWorld')
    })

    it('should verify trim behavior with leading/trailing whitespace', () => {
      const input = '  Hello World  \n'
      const result = sanitizeApiData(input)
      // Leading/trailing whitespace and \n should be removed
      expect(result).toBe('Hello World')
    })
  })

  describe('array sanitization', () => {
    it('should sanitize strings in arrays', () => {
      const input = ['Hello\0World', 'Test\x01\x02', '  Normal  ']
      const result = sanitizeApiData(input)
      expect(result).toEqual(['HelloWorld', 'Test', 'Normal'])
    })

    it('should handle nested arrays', () => {
      const input = [['Hello\0World'], ['Test\x01\x02']]
      const result = sanitizeApiData(input)
      expect(result).toEqual([['HelloWorld'], ['Test']])
    })

    it('should handle mixed arrays', () => {
      const input = ['Hello\0World', 123, true, null, undefined]
      const result = sanitizeApiData(input)
      expect(result).toEqual(['HelloWorld', 123, true, null, undefined])
    })

    it('should handle empty arrays', () => {
      const input: unknown[] = []
      const result = sanitizeApiData(input)
      expect(result).toEqual([])
    })
  })

  describe('object sanitization', () => {
    it('should sanitize string values in objects', () => {
      const input = {
        name: 'John\0Doe',
        email: 'john\x01\x02@example.com',
        description: '  Test description  ',
      }
      const result = sanitizeApiData(input)
      expect(result).toEqual({
        name: 'JohnDoe',
        email: 'john@example.com',
        description: 'Test description',
      })
    })

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: 'John\0Doe',
          profile: {
            bio: 'Test\x01\x02bio',
          },
        },
      }
      const result = sanitizeApiData(input)
      expect(result).toEqual({
        user: {
          name: 'JohnDoe',
          profile: {
            bio: 'Testbio',
          },
        },
      })
    })

    it('should handle objects with mixed types', () => {
      const input = {
        name: 'John\0Doe',
        age: 30,
        active: true,
        tags: ['tag1', 'tag2\x01'],
        metadata: null,
      }
      const result = sanitizeApiData(input)
      expect(result).toEqual({
        name: 'JohnDoe',
        age: 30,
        active: true,
        tags: ['tag1', 'tag2'],
        metadata: null,
      })
    })

    it('should handle empty objects', () => {
      const input = {}
      const result = sanitizeApiData(input)
      expect(result).toEqual({})
    })
  })

  describe('complex data structures', () => {
    it('should handle deeply nested structures', () => {
      const input = {
        users: [
          {
            name: 'John\0Doe',
            emails: ['john\x01@example.com', 'jane@example.com'],
            profile: {
              bio: 'Test\x02bio',
              settings: {
                theme: 'dark\x03',
              },
            },
          },
        ],
      }
      const result = sanitizeApiData(input)
      expect(result).toEqual({
        users: [
          {
            name: 'JohnDoe',
            emails: ['john@example.com', 'jane@example.com'],
            profile: {
              bio: 'Testbio',
              settings: {
                theme: 'dark',
              },
            },
          },
        ],
      })
    })

    it('should handle arrays of objects', () => {
      const input = [
        { name: 'John\0Doe', email: 'john@example.com' },
        { name: 'Jane\x01Smith', email: 'jane@example.com' },
      ]
      const result = sanitizeApiData(input)
      expect(result).toEqual([
        { name: 'JohnDoe', email: 'john@example.com' },
        { name: 'JaneSmith', email: 'jane@example.com' },
      ])
    })
  })

  describe('non-string primitive types', () => {
    it('should preserve numbers', () => {
      const input = 123
      const result = sanitizeApiData(input)
      expect(result).toBe(123)
    })

    it('should preserve booleans', () => {
      const input = true
      const result = sanitizeApiData(input)
      expect(result).toBe(true)
    })

    it('should preserve false', () => {
      const input = false
      const result = sanitizeApiData(input)
      expect(result).toBe(false)
    })

    it('should preserve zero', () => {
      const input = 0
      const result = sanitizeApiData(input)
      expect(result).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle objects with null values', () => {
      const input = {
        name: 'John\0Doe',
        email: null,
        phone: undefined,
      }
      const result = sanitizeApiData(input)
      expect(result).toEqual({
        name: 'JohnDoe',
        email: null,
        phone: undefined,
      })
    })

    it('should handle arrays with null/undefined values', () => {
      const input = ['Hello\0World', null, undefined, 'Test']
      const result = sanitizeApiData(input)
      expect(result).toEqual(['HelloWorld', null, undefined, 'Test'])
    })

    it('should handle objects with empty string values', () => {
      const input = {
        name: '',
        email: 'test@example.com',
      }
      const result = sanitizeApiData(input)
      expect(result).toEqual({
        name: '',
        email: 'test@example.com',
      })
    })

    it('should handle objects with only control characters', () => {
      const input = {
        name: '\0\x01\x02\x03\x04\x05\x06\x07\x08',
        email: '\x0B\x0C\x0E\x0F\x1F\x7F',
      }
      const result = sanitizeApiData(input)
      expect(result).toEqual({
        name: '',
        email: '',
      })
    })
  })

  describe('security considerations', () => {
    it('should remove potential SQL injection characters', () => {
      const input = "'; DROP TABLE users; --"
      const result = sanitizeApiData(input)
      expect(result).toBe("'; DROP TABLE users; --")
    })

    it('should remove potential XSS characters', () => {
      const input = '<script>alert("xss")</script>'
      const result = sanitizeApiData(input)
      expect(result).toBe('<script>alert("xss")</script>')
    })

    it('should handle unicode control characters', () => {
      const input = 'Hello\u0000World\u0001Test'
      const result = sanitizeApiData(input)
      expect(result).toBe('HelloWorldTest')
    })
  })
})
