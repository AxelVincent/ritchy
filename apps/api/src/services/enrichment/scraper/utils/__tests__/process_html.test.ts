import { describe, expect, it } from 'vitest'
import { processHtml } from '../process_html'

describe('processHtml', () => {
  it('should sanitize HTML and remove forbidden tags', () => {
    const html = `
      <html>
        <head><title>Test</title></head>
        <body>
          <h1>Main Content</h1>
          <p>This is important content.</p>
          <script>alert('malicious')</script>
          <style>body { color: red; }</style>
          <iframe src="evil.com"></iframe>
          <noscript>No script content</noscript>
          <object data="file.pdf"></object>
          <embed src="video.mp4">
          <canvas></canvas>
          <video></video>
          <audio></audio>
          <form><input type="text"><button>Submit</button></form>
          <textarea></textarea>
        </body>
      </html>
    `

    const result = processHtml(html)

    // Should remove script, style, and iframe tags (removed by Cheerio)
    expect(result.sanitizedHtml).not.toContain('<script>')
    expect(result.sanitizedHtml).not.toContain('<style>')
    expect(result.sanitizedHtml).not.toContain('<iframe>')

    // Should remove additional forbidden tags (removed by Cheerio)
    expect(result.sanitizedHtml).not.toContain('<noscript>')
    expect(result.sanitizedHtml).not.toContain('<object>')
    expect(result.sanitizedHtml).not.toContain('<embed>')
    expect(result.sanitizedHtml).not.toContain('<canvas>')
    expect(result.sanitizedHtml).not.toContain('<video>')
    expect(result.sanitizedHtml).not.toContain('<audio>')
    expect(result.sanitizedHtml).not.toContain('<input>')
    expect(result.sanitizedHtml).not.toContain('<textarea>')

    // Should remove form, input, button tags (forbidden by DOMPurify)
    expect(result.sanitizedHtml).not.toContain('<form>')
    expect(result.sanitizedHtml).not.toContain('<input>')
    expect(result.sanitizedHtml).not.toContain('<button>')

    // Should preserve main content
    expect(result.sanitizedHtml).toContain('<h1>Main Content</h1>')
    expect(result.sanitizedHtml).toContain('<p>This is important content.</p>')
  })

  it('should remove ads elements and attributes but preserve most content', () => {
    const html = `
      <html>
        <body>
          <header>
            <a href="/header-link">Header Link</a>
          </header>
          <nav>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </nav>
          <main>
            <h1>Important Content</h1>
            <p>This should be preserved with <a href="/important">important link</a>.</p>
            <div class="social-share">
              <a href="/share/twitter">Share on Twitter</a>
              <a href="/share/facebook">Share on Facebook</a>
            </div>
            <img src="image.jpg" alt="This image will be removed">
          </main>
          <footer>
            <a href="/footer-link">Footer Link</a>
          </footer>
          <div class="sidebar">
            <a href="/sidebar-link">Sidebar Link</a>
          </div>
          <div class="ads">Advertisement with <a href="/ad-link">ad link</a></div>
        </body>
      </html>
    `

    const result = processHtml(html)

    // Should remove .ads elements (removed by Cheerio)
    expect(result.sanitizedHtml).not.toContain('Advertisement')
    expect(result.sanitizedHtml).not.toContain('ad link')

    // Should remove class attributes (removed by Cheerio)
    expect(result.sanitizedHtml).not.toContain('class="sidebar"')
    expect(result.sanitizedHtml).not.toContain('class="ads"')
    expect(result.sanitizedHtml).not.toContain('class="social-share"')

    // Should remove img tags (forbidden by DOMPurify)
    expect(result.sanitizedHtml).not.toContain('<img')

    // Should preserve header, nav, footer elements (not removed in HTML processing)
    expect(result.sanitizedHtml).toContain('<header>')
    expect(result.sanitizedHtml).toContain('<nav>')
    expect(result.sanitizedHtml).toContain('<footer>')

    // Should preserve links from all containers in HTML
    expect(result.sanitizedHtml).toContain('Header Link')
    expect(result.sanitizedHtml).toContain('Home')
    expect(result.sanitizedHtml).toContain('About')
    expect(result.sanitizedHtml).toContain('Footer Link')
    expect(result.sanitizedHtml).toContain('Sidebar Link')

    // Should preserve main content and its links
    expect(result.sanitizedHtml).toContain('Important Content')
    expect(result.sanitizedHtml).toContain('This should be preserved')
    expect(result.sanitizedHtml).toContain(
      '<a href="/important">important link</a>',
    )

    // Should preserve social share links (no class attributes though)
    expect(result.sanitizedHtml).toContain(
      '<a href="/share/twitter">Share on Twitter</a>',
    )
    expect(result.sanitizedHtml).toContain(
      '<a href="/share/facebook">Share on Facebook</a>',
    )

    // cleanedHtml should be the same as sanitizedHtml
    expect(result.cleanedHtml).toBe(result.sanitizedHtml)
  })

  it('should convert HTML to markdown while removing unwanted containers', () => {
    const html = `
      <html>
        <body>
          <header>
            <a href="/header-link">Header Link</a>
          </header>
          <nav>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </nav>
          <main>
            <h1>Main Title</h1>
            <p>This is a <strong>paragraph</strong> with <em>emphasis</em> and a <a href="/link">useful link</a>.</p>
            <ul>
              <li>First item</li>
              <li>Second item with <a href="/item2">link</a></li>
            </ul>
          </main>
          <footer>
            <a href="/footer-link">Footer Link</a>
          </footer>
        </body>
      </html>
    `

    const result = processHtml(html)

    // Should convert to proper markdown
    expect(result.markdown).toContain('# Main Title')
    expect(result.markdown).toContain('**paragraph**')
    expect(result.markdown).toContain('*emphasis*')
    expect(result.markdown).toContain('- First item')
    expect(result.markdown).toContain('- Second item')

    // Should preserve links in markdown format
    expect(result.markdown).toContain('[useful link](/link)')
    expect(result.markdown).toContain('[link](/item2)')

    // Should NOT contain header/nav/footer content in markdown (removed by htmlToMarkdown)
    expect(result.markdown).not.toContain('Header Link')
    expect(result.markdown).not.toContain('Home')
    expect(result.markdown).not.toContain('About')
    expect(result.markdown).not.toContain('Footer Link')
  })

  it('should handle empty or invalid HTML gracefully', () => {
    const html = ''
    const result = processHtml(html)

    expect(result.sanitizedHtml).toBe('')
    expect(result.cleanedHtml).toBe('')
    expect(result.markdown).toBe('')
  })

  it('should remove malicious attributes but preserve href', () => {
    const html = `
      <div id="unique-id" onclick="alert('xss')" onload="malicious()" data-tracking="user123" data-analytics="click">
        <p onerror="hack()" class="content-class" style="color: red;">Safe content</p>
        <a href="/safe-link" onclick="steal()" id="link-id" class="link-class">Safe Link</a>
        <img src="image.jpg" onmouseover="steal()" id="image-id">
      </div>
    `

    const result = processHtml(html)

    // Should remove malicious attributes (removed by Cheerio)
    expect(result.sanitizedHtml).not.toContain('onclick')
    expect(result.sanitizedHtml).not.toContain('onload')
    expect(result.sanitizedHtml).not.toContain('onerror')
    expect(result.sanitizedHtml).not.toContain('onmouseover')

    // Should remove id, class, style, and data attributes (removed by Cheerio)
    expect(result.sanitizedHtml).not.toContain('id=')
    expect(result.sanitizedHtml).not.toContain('class=')
    expect(result.sanitizedHtml).not.toContain('style=')
    expect(result.sanitizedHtml).not.toContain('data-')

    // Should preserve safe content and href attribute
    expect(result.sanitizedHtml).toContain('Safe content')
    expect(result.sanitizedHtml).toContain('<a href="/safe-link">Safe Link</a>')

    // Should remove img tag (forbidden by DOMPurify)
    expect(result.sanitizedHtml).not.toContain('<img')
  })

  it('should handle complex nested structures', () => {
    const html = `
      <html>
        <body>
          <header>
            <nav>
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
              </ul>
            </nav>
          </header>
          <main>
            <article>
              <h1>Article Title</h1>
              <div class="content">
                <p>Article content with <a href="/external" target="_blank">external link</a>.</p>
                <div class="social-share">
                  <a href="/share/twitter">Share on Twitter</a>
                </div>
                <img src="article-image.jpg" alt="Article image">
              </div>
            </article>
          </main>
          <aside class="sidebar">
            <div class="ads">
              <a href="/ad-link">Advertisement Link</a>
            </div>
          </aside>
          <footer>
            <a href="/contact">Contact Us</a>
          </footer>
        </body>
      </html>
    `

    const result = processHtml(html)

    // Should preserve header, nav, footer elements in HTML (not removed by Cheerio)
    expect(result.sanitizedHtml).toContain('<header>')
    expect(result.sanitizedHtml).toContain('<nav>')
    expect(result.sanitizedHtml).toContain('<footer>')

    // Should remove .ads elements (removed by Cheerio)
    expect(result.sanitizedHtml).not.toContain('Advertisement Link')

    // Should remove img tags (forbidden by DOMPurify)
    expect(result.sanitizedHtml).not.toContain('<img')

    // Should remove class attributes (removed by Cheerio)
    expect(result.sanitizedHtml).not.toContain('class="sidebar"')
    expect(result.sanitizedHtml).not.toContain('class="content"')

    // Should remove target attributes (not in allowed attributes)
    expect(result.sanitizedHtml).not.toContain('target="_blank"')

    // Should preserve all content and links in HTML
    expect(result.sanitizedHtml).toContain('Home')
    expect(result.sanitizedHtml).toContain('About')
    expect(result.sanitizedHtml).toContain('Contact Us')
    expect(result.sanitizedHtml).toContain('Article Title')
    expect(result.sanitizedHtml).toContain('Article content')
    expect(result.sanitizedHtml).toContain(
      '<a href="/external">external link</a>',
    )
    expect(result.sanitizedHtml).toContain(
      '<a href="/share/twitter">Share on Twitter</a>',
    )

    // Markdown should remove header/nav/footer/aside content (removed by htmlToMarkdown)
    expect(result.markdown).not.toContain('Home')
    expect(result.markdown).not.toContain('About')
    expect(result.markdown).not.toContain('Contact Us')

    // But preserve main content in markdown
    expect(result.markdown).toContain('# Article Title')
    expect(result.markdown).toContain('Article content')
    expect(result.markdown).toContain('[external link](/external)')
    expect(result.markdown).toContain('[Share on Twitter](/share/twitter)')
  })

  it('should preserve links with various href formats (except javascript)', () => {
    const html = `
      <html>
        <body>
          <p>Different link types:</p>
          <a href="https://external.com">External HTTPS</a>
          <a href="http://external.com">External HTTP</a>
          <a href="/internal/path">Internal Absolute</a>
          <a href="relative/path">Internal Relative</a>
          <a href="#anchor">Anchor Link</a>
          <a href="mailto:test@example.com">Email Link</a>
          <a href="tel:+1234567890">Phone Link</a>
          <a href="javascript:void(0)">JavaScript Link</a>
        </body>
      </html>
    `

    const result = processHtml(html)

    // Should preserve most types of links
    expect(result.sanitizedHtml).toContain(
      '<a href="https://external.com">External HTTPS</a>',
    )
    expect(result.sanitizedHtml).toContain(
      '<a href="http://external.com">External HTTP</a>',
    )
    expect(result.sanitizedHtml).toContain(
      '<a href="/internal/path">Internal Absolute</a>',
    )
    expect(result.sanitizedHtml).toContain(
      '<a href="relative/path">Internal Relative</a>',
    )
    expect(result.sanitizedHtml).toContain('<a href="#anchor">Anchor Link</a>')
    expect(result.sanitizedHtml).toContain(
      '<a href="mailto:test@example.com">Email Link</a>',
    )
    expect(result.sanitizedHtml).toContain(
      '<a href="tel:+1234567890">Phone Link</a>',
    )

    // JavaScript links are sanitized by DOMPurify for security
    expect(result.sanitizedHtml).toContain('JavaScript Link')
    expect(result.sanitizedHtml).not.toContain('javascript:void(0)')
  })

  it('should work with URL parameter for context', () => {
    const html = '<h1>Test Content</h1><a href="/test">Test Link</a>'
    const url = 'https://example.com/page'

    const result = processHtml(html, url)

    expect(result.sanitizedHtml).toContain('<h1>Test Content</h1>')
    expect(result.sanitizedHtml).toContain('<a href="/test">Test Link</a>')
    expect(result.markdown).toContain('# Test Content')
    expect(result.markdown).toContain('[Test Link](/test)')
  })

  it('should throw error when HTML size exceeds limit', () => {
    // Create HTML larger than 1.5MB (1.5 * 1024 * 1024 bytes)
    const largeContent = 'x'.repeat(1.5 * 1024 * 1024 + 1)
    const html = `<html><body><p>${largeContent}</p></body></html>`
    const url = 'https://example.com/large-page'

    expect(() => {
      processHtml(html, url)
    }).toThrow('HTML size exceeds limit')
  })

  it('should handle HTML at the size limit', () => {
    // Create HTML exactly at 1.5MB limit
    const maxContent = 'x'.repeat(1.5 * 1024 * 1024 - 100) // Leave room for HTML tags
    const html = `<html><body><p>${maxContent}</p></body></html>`

    expect(() => {
      processHtml(html)
    }).not.toThrow()

    const result = processHtml(html)
    expect(result.sanitizedHtml).toContain('<p>')
    expect(result.markdown).toContain(maxContent.substring(0, 100)) // Check a portion
  })

  it('should properly dispose of JSDOM resources', () => {
    const html = '<p>Test content</p>'

    // This test mainly ensures no memory leaks occur
    // We can't directly test JSDOM disposal, but the function should complete without errors
    expect(() => {
      for (let i = 0; i < 10; i++) {
        processHtml(html)
      }
    }).not.toThrow()
  })

  it('should handle sanitizedHtml and cleanedHtml being identical', () => {
    const html = `
      <div class="test" id="test">
        <p>Content</p>
        <a href="/link">Link</a>
      </div>
    `

    const result = processHtml(html)

    // Both should be identical since they go through the same process
    expect(result.sanitizedHtml).toBe(result.cleanedHtml)

    // Should not contain attributes
    expect(result.sanitizedHtml).not.toContain('class=')
    expect(result.sanitizedHtml).not.toContain('id=')

    // Should preserve content and href
    expect(result.sanitizedHtml).toContain('Content')
    expect(result.sanitizedHtml).toContain('<a href="/link">Link</a>')
  })
})
