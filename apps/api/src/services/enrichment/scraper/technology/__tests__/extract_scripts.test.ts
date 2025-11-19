import { describe, expect, it } from 'vitest'
import { extractScripts } from '../extract_scripts'

describe('extractScripts', () => {
  const baseUrl = 'https://example.com'

  describe('script URL extraction', () => {
    it('should extract script URLs from <script src> tags', () => {
      const html = `
        <html>
          <head>
            <script src="https://cdn.example.com/analytics.js"></script>
            <script src="/static/app.js"></script>
          </head>
        </html>
      `

      const results = extractScripts(html, baseUrl)
      const scriptUrls = results.filter((s) => s.type === 'script_url')

      expect(scriptUrls).toHaveLength(2)
      expect(scriptUrls[0].value).toBe('https://cdn.example.com/analytics.js')
      expect(scriptUrls[1].value).toBe('https://example.com/static/app.js')
    })

    it('should normalize relative URLs to absolute', () => {
      const html = `
        <script src="/js/app.js"></script>
        <script src="./utils.js"></script>
        <script src="../vendor.js"></script>
      `

      const results = extractScripts(html, baseUrl)
      const scriptUrls = results.filter((s) => s.type === 'script_url')

      expect(scriptUrls[0].value).toBe('https://example.com/js/app.js')
      expect(scriptUrls[1].value).toContain('example.com')
      expect(scriptUrls[2].value).toContain('example.com')
    })

    it('should deduplicate script URLs', () => {
      const html = `
        <script src="https://cdn.example.com/script.js"></script>
        <script src="https://cdn.example.com/script.js"></script>
        <script src="https://cdn.example.com/other.js"></script>
      `

      const results = extractScripts(html, baseUrl)
      const scriptUrls = results.filter((s) => s.type === 'script_url')

      expect(scriptUrls).toHaveLength(2)
    })

    it('should extract dynamically loaded script URLs from inline code', () => {
      const html = `
        <script>
          var m = document.createElement('script');
          m.src = "https://cdn.segment.com/analytics.js";
          document.head.appendChild(m);
        </script>
      `

      const results = extractScripts(html, baseUrl)
      const scriptUrls = results.filter((s) => s.type === 'script_url')

      expect(scriptUrls).toHaveLength(1)
      expect(scriptUrls[0].value).toBe('https://cdn.segment.com/analytics.js')
    })

    it('should handle protocol-relative URLs in dynamic scripts', () => {
      const html = `
        <script>
          element.src = "//cdn.example.com/script.js";
        </script>
      `

      const results = extractScripts(html, baseUrl)
      const scriptUrls = results.filter((s) => s.type === 'script_url')

      expect(scriptUrls).toHaveLength(1)
      expect(scriptUrls[0].value).toContain('cdn.example.com/script.js')
    })
  })

  describe('inline code extraction', () => {
    it('should extract inline script code (limited to 300 chars)', () => {
      const shortCode = 'console.log("Hello World"); window.dataLayer = [];'
      const html = `<script>${shortCode}</script>`

      const results = extractScripts(html, baseUrl)
      const inlineScripts = results.filter((s) => s.type === 'inline_code')

      expect(inlineScripts).toHaveLength(1)
      expect(inlineScripts[0].value).toBe(shortCode)
    })

    it('should truncate inline code to 300 characters', () => {
      const longCode = 'a'.repeat(500)
      const html = `<script>${longCode}</script>`

      const results = extractScripts(html, baseUrl)
      const inlineScripts = results.filter((s) => s.type === 'inline_code')

      expect(inlineScripts).toHaveLength(1)
      expect(inlineScripts[0].value).toHaveLength(300)
    })

    it('should skip scripts shorter than 30 characters', () => {
      const html = '<script>var x=1;</script>'

      const results = extractScripts(html, baseUrl)
      const inlineScripts = results.filter((s) => s.type === 'inline_code')

      expect(inlineScripts).toHaveLength(0)
    })

    it('should skip JSON-LD and data-only scripts', () => {
      const html = `
        <script type="application/ld+json">
          {"@context": "https://schema.org", "@type": "Organization"}
        </script>
        <script>
          [{"id": 1, "name": "test"}]
        </script>
      `

      const results = extractScripts(html, baseUrl)
      const inlineScripts = results.filter((s) => s.type === 'inline_code')

      expect(inlineScripts).toHaveLength(0)
    })

    it('should not extract inline code from scripts with src attribute', () => {
      const html = `
        <script src="https://example.com/script.js">
          console.log("This should be ignored");
        </script>
      `

      const results = extractScripts(html, baseUrl)
      const inlineScripts = results.filter((s) => s.type === 'inline_code')

      expect(inlineScripts).toHaveLength(0)
    })
  })

  describe('meta tag extraction', () => {
    it('should extract generator meta tags', () => {
      const html = `
        <meta name="generator" content="WordPress 6.0">
        <meta name="generator" content="Shopify">
      `

      const results = extractScripts(html, baseUrl)
      const metaTags = results.filter((s) => s.type === 'meta_tag')

      expect(metaTags).toHaveLength(2)
      expect(metaTags[0].value).toBe('generator:WordPress 6.0')
      expect(metaTags[1].value).toBe('generator:Shopify')
    })

    it('should extract Facebook/OpenGraph meta tags', () => {
      const html = `
        <meta property="fb:app_id" content="123456789">
        <meta property="og:type" content="website">
      `

      const results = extractScripts(html, baseUrl)
      const metaTags = results.filter((s) => s.type === 'meta_tag')

      expect(metaTags).toHaveLength(2)
      expect(metaTags[0].value).toBe('fb:app_id:123456789')
      expect(metaTags[1].value).toBe('og:type:website')
    })

    it('should extract Twitter meta tags', () => {
      const html = '<meta name="twitter:site" content="@example">'

      const results = extractScripts(html, baseUrl)
      const metaTags = results.filter((s) => s.type === 'meta_tag')

      expect(metaTags).toHaveLength(1)
      expect(metaTags[0].value).toBe('twitter:site:@example')
    })

    it('should skip irrelevant meta tags', () => {
      const html = `
        <meta name="description" content="A website">
        <meta name="keywords" content="test">
        <meta charset="UTF-8">
      `

      const results = extractScripts(html, baseUrl)
      const metaTags = results.filter((s) => s.type === 'meta_tag')

      expect(metaTags).toHaveLength(0)
    })
  })

  describe('iframe extraction', () => {
    it('should extract iframe sources', () => {
      const html = `
        <iframe src="https://www.youtube.com/embed/video123"></iframe>
        <iframe src="https://calendly.com/widget"></iframe>
      `

      const results = extractScripts(html, baseUrl)
      const iframes = results.filter((s) => s.type === 'iframe')

      expect(iframes).toHaveLength(2)
      expect(iframes[0].value).toBe('https://www.youtube.com/embed/video123')
      expect(iframes[1].value).toBe('https://calendly.com/widget')
    })

    it('should skip iframes without src attribute', () => {
      const html = '<iframe></iframe>'

      const results = extractScripts(html, baseUrl)
      const iframes = results.filter((s) => s.type === 'iframe')

      expect(iframes).toHaveLength(0)
    })
  })

  describe('comprehensive extraction', () => {
    it('should extract all signal types from complex HTML', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="generator" content="WordPress">
            <meta property="og:type" content="website">
            <script src="https://cdn.example.com/analytics.js"></script>
            <script>
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
            </script>
          </head>
          <body>
            <iframe src="https://www.youtube.com/embed/abc"></iframe>
            <script>
              var s = document.createElement('script');
              s.src = "https://cdn.segment.com/analytics.js";
            </script>
          </body>
        </html>
      `

      const results = extractScripts(html, baseUrl)

      expect(results.filter((s) => s.type === 'script_url').length).toBe(2)
      expect(results.filter((s) => s.type === 'inline_code').length).toBe(2)
      expect(results.filter((s) => s.type === 'meta_tag').length).toBe(2)
      expect(results.filter((s) => s.type === 'iframe').length).toBe(1)
      expect(results.length).toBe(7)
    })

    it('should return empty array for empty HTML', () => {
      const results = extractScripts('', baseUrl)
      expect(results).toEqual([])
    })

    it('should handle malformed HTML gracefully', () => {
      const html = '<script src="test.js"<script>'
      expect(() => extractScripts(html, baseUrl)).not.toThrow()
    })
  })
})
