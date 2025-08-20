import { describe, expect, it } from 'vitest'
import { createHtmlChunks } from '../create_html_chunks'

describe('HTML Chunking', () => {
  describe('createHtmlChunks', () => {
    it('should create chunks at whitespace boundaries', () => {
      const htmlText = '<div>This is a test string with spaces and words</div>'
      const chunks = createHtmlChunks(htmlText, 20)

      // Each chunk should end with complete words (except possibly the last)
      for (const chunk of chunks.slice(0, -1)) {
        const lastChar = chunk[chunk.length - 1]
        expect(/\s/.test(lastChar) || chunk.length < 20).toBe(true)
      }

      // All chunks combined should equal original text
      expect(chunks.join('')).toBe(htmlText)
    })

    it('should handle HTML without spaces gracefully', () => {
      const htmlText = '<div><span>abcdefghijklmnopqrstuvwxyz</span></div>'
      const chunks = createHtmlChunks(htmlText, 15)

      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks.join('')).toBe(htmlText)
    })

    it('should handle empty HTML', () => {
      const chunks = createHtmlChunks('', 100)
      expect(chunks).toEqual([])
    })

    it('should handle HTML shorter than chunk size', () => {
      const htmlText = '<p>short</p>'
      const chunks = createHtmlChunks(htmlText, 100)
      expect(chunks).toEqual([htmlText])
    })

    it('should preserve HTML structure across chunks', () => {
      const htmlText = `
        <html>
          <body>
            <div class="container">
              <p>This is a paragraph with some text content</p>
              <ul>
                <li>First item</li>
                <li>Second item</li>
              </ul>
            </div>
          </body>
        </html>
      `
      const chunks = createHtmlChunks(htmlText, 50)

      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks.join('')).toBe(htmlText)
    })

    it('should handle large HTML efficiently', () => {
      const largeHtml = `<div>${'content '.repeat(10000)}</div>`
      const chunks = createHtmlChunks(largeHtml, 1000)

      expect(chunks.length).toBeGreaterThan(10)
      expect(chunks.join('')).toBe(largeHtml)
    })

    it('should cut at the nearest whitespace before the chunk limit', () => {
      const htmlText = '<p>word1 word2 word3 word4 word5</p>'
      const chunks = createHtmlChunks(htmlText, 15) // Should cut before a complete word

      for (const chunk of chunks.slice(0, -1)) {
        expect(chunk.length).toBeLessThanOrEqual(15)
        if (chunk.length > 0) {
          const lastChar = chunk[chunk.length - 1]
          expect(
            /\s/.test(lastChar) || chunk === chunks[chunks.length - 1],
          ).toBe(true)
        }
      }
    })

    it('should preserve href attributes without breaking them', () => {
      const htmlText =
        '<a href="mailto:test@example.com">Contact</a> <a href="https://example.com/very/long/path">Link</a>'
      const chunks = createHtmlChunks(htmlText, 30)

      // Reconstruct and verify integrity
      const reconstructed = chunks.join('')
      expect(reconstructed).toBe(htmlText)

      // Verify href attributes are not broken across chunks
      const fullHrefPattern = /href="[^"]*"/g
      const originalHrefs = htmlText.match(fullHrefPattern) || []
      const reconstructedHrefs = reconstructed.match(fullHrefPattern) || []

      expect(reconstructedHrefs).toEqual(originalHrefs)
    })

    it('should handle complex href URLs without breaking them', () => {
      const htmlText = `
        <div>
          <a href="mailto:contact@company.com?subject=Inquiry&body=Hello">Email us</a>
          <a href="https://example.com/path/to/resource?param1=value1&param2=value2">Long URL</a>
          <a href="tel:+1-555-123-4567">Call us</a>
        </div>
      `
      const chunks = createHtmlChunks(htmlText, 40)

      const reconstructed = chunks.join('')
      expect(reconstructed).toBe(htmlText)

      // Check that all href values are complete
      const hrefValues = reconstructed.match(/href="([^"]*)"/g) || []
      expect(hrefValues).toContain(
        'href="mailto:contact@company.com?subject=Inquiry&body=Hello"',
      )
      expect(hrefValues).toContain(
        'href="https://example.com/path/to/resource?param1=value1&param2=value2"',
      )
      expect(hrefValues).toContain('href="tel:+1-555-123-4567"')
    })

    it('should preserve onclick attributes with href content', () => {
      const htmlText = `
        <button onclick="window.location.href='mailto:support@test.org'">Email Support</button>
        <div onclick="location.href='https://example.com/redirect'">Click me</div>
      `
      const chunks = createHtmlChunks(htmlText, 35)

      const reconstructed = chunks.join('')
      expect(reconstructed).toBe(htmlText)

      // Verify onclick attributes with href are preserved
      expect(reconstructed).toContain(
        'onclick="window.location.href=\'mailto:support@test.org\'"',
      )
      expect(reconstructed).toContain(
        'onclick="location.href=\'https://example.com/redirect\'"',
      )
    })

    it('should handle mixed content with multiple href attributes', () => {
      const htmlText = `
        <nav>
          <a href="/home">Home</a>
          <a href="/about">About</a>
          <a href="mailto:info@company.com">Contact</a>
        </nav>
        <main>
          <p>Visit our <a href="https://blog.example.com">blog</a> for updates.</p>
          <button onclick="location.href='/signup'">Sign Up</button>
        </main>
      `
      const chunks = createHtmlChunks(htmlText, 50)

      const reconstructed = chunks.join('')
      expect(reconstructed).toBe(htmlText)

      // Count href occurrences to ensure none are lost or duplicated
      const originalHrefCount = (htmlText.match(/href=/g) || []).length
      const reconstructedHrefCount = (reconstructed.match(/href=/g) || [])
        .length

      expect(reconstructedHrefCount).toBe(originalHrefCount)
    })

    it('should handle href attributes with special characters', () => {
      const htmlText = `
        <a href="mailto:test@domain.com?subject=Hello%20World&body=Line1%0ALine2">Email</a>
        <a href="https://example.com/search?q=test+query&filter=type%3Aarticle">Search</a>
      `
      const chunks = createHtmlChunks(htmlText, 40)

      const reconstructed = chunks.join('')
      expect(reconstructed).toBe(htmlText)

      // Verify encoded characters in href are preserved
      expect(reconstructed).toContain(
        'subject=Hello%20World&body=Line1%0ALine2',
      )
      expect(reconstructed).toContain('q=test+query&filter=type%3Aarticle')
    })

    it('should not break href attributes even with very small chunk sizes', () => {
      const htmlText = '<a href="mailto:test@example.com">Email</a>'
      const chunks = createHtmlChunks(htmlText, 10) // Very small chunks

      const reconstructed = chunks.join('')
      expect(reconstructed).toBe(htmlText)

      // Verify the href attribute is still complete
      expect(reconstructed).toMatch(/href="mailto:test@example\.com"/)
    })
  })
})
