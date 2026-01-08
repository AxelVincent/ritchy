import { describe, expect, it } from 'vitest'
import { htmlToMarkdown } from '../html_to_markdown'

describe('htmlToMarkdown - Vectorization Optimized', () => {
  it('should convert basic HTML to clean markdown', () => {
    const html =
      '<h1>Hello World</h1><p>This is a test paragraph with meaningful content.</p>'
    const expected =
      '# Hello World\n\nThis is a test paragraph with meaningful content.'
    expect(htmlToMarkdown(html)).toBe(expected)
  })

  it('should handle structured headings properly', () => {
    const html = `
      <h1>Main Title</h1>
      <h2>Subtitle</h2>
      <h3>Section Header</h3>
    `
    const expected = '# Main Title\n\n## Subtitle\n\n### Section Header'
    expect(htmlToMarkdown(html)).toBe(expected)
  })

  it('should preserve semantic emphasis', () => {
    const html =
      '<p>This has <strong>important content</strong> and <em>emphasis here</em>.</p>'
    const expected = 'This has **important content** and *emphasis here*.'
    expect(htmlToMarkdown(html)).toBe(expected)
  })

  it('should clean up lists for better vectorization', () => {
    const html = `
      <ul>
        <li>Important feature one</li>
        <li>Key benefit two</li>
        <li>Essential service three</li>
      </ul>
    `
    const expected =
      '- Important feature one\n- Key benefit two\n- Essential service three'
    expect(htmlToMarkdown(html)).toBe(expected)
  })

  it('should remove noise elements', () => {
    const html = `
      <div>
        <nav>Navigation menu</nav>
        <header>Site header</header>
        <main>
          <h1>Main Content</h1>
          <p>This is the actual content that matters for vectorization.</p>
        </main>
        <footer>Footer content</footer>
        <script>console.log('noise')</script>
        <style>.noise { display: none; }</style>
      </div>
    `
    const expected =
      '# Main Content\n\nThis is the actual content that matters for vectorization.'
    expect(htmlToMarkdown(html)).toBe(expected)
  })

  it('should remove empty and short content', () => {
    const html = `
      <p>This is substantial content that provides meaningful information.</p>
      <p></p>
      <p>   </p>
      <p>Short</p>
      <p>Another meaningful paragraph with enough content for context.</p>
    `
    const expected =
      'This is substantial content that provides meaningful information. \n\nAnother meaningful paragraph with enough content for context.'
    expect(htmlToMarkdown(html)).toBe(expected)
  })

  it('should flatten divs for better structure', () => {
    const html = `
      <div>
        <div>
          <h2>Nested Header</h2>
          <p>Content inside nested divs gets flattened for better vectorization.</p>
        </div>
        <div>
          <p>More content in another div that should flow naturally.</p>
        </div>
      </div>
    `
    const expected =
      '## Nested Header\n\nContent inside nested divs gets flattened for better vectorization. \n\nMore content in another div that should flow naturally.'
    expect(htmlToMarkdown(html)).toBe(expected)
  })

  it('should normalize spacing and punctuation', () => {
    const html = `
      <p>Text with    multiple   spaces....and excessive dots.</p>
      <p>Sentence one.Another sentence without space.</p>
    `
    const expected =
      'Text with multiple spaces...and excessive dots. \n\nSentence one. Another sentence without space.'
    expect(htmlToMarkdown(html)).toBe(expected)
  })

  it('should handle complex website content for vectorization', () => {
    const html = `
      <html>
        <head><title>Page Title</title></head>
        <body>
          <nav><a href="#home">Home</a></nav>
          <header>Site Header</header>
          
          <main>
            <h1>Company Overview</h1>
            <p>We provide innovative solutions for modern businesses seeking growth.</p>
            
            <h2>Our Services</h2>
            <ul>
              <li>Strategic consulting for digital transformation</li>
              <li>Custom software development solutions</li>
              <li>Data analytics and business intelligence</li>
            </ul>
            
            <h2>Why Choose Us</h2>
            <p>Our team has <strong>extensive experience</strong> in delivering <em>exceptional results</em> for clients.</p>
            
            <div>
              <p>Additional information about our methodology and approach.</p>
            </div>
          </main>
          
          <footer>Copyright 2024</footer>
        </body>
      </html>
    `
    const expected = `# Company Overview

We provide innovative solutions for modern businesses seeking growth.

## Our Services
- Strategic consulting for digital transformation
- Custom software development solutions
- Data analytics and business intelligence

## Why Choose Us

Our team has **extensive experience** in delivering *exceptional results* for clients. 

Additional information about our methodology and approach.`

    expect(htmlToMarkdown(html)).toBe(expected)
  })

  it('should preserve meaningful content while removing noise', () => {
    const html = `
      <article>
        <h1>Article Title</h1>
        <aside>Related links sidebar</aside>
        <p>This article discusses important topics relevant to the industry.</p>
        <p>More detailed analysis follows in this comprehensive overview.</p>
        <nav>Article navigation</nav>
      </article>
    `
    const expected = `# Article Title

This article discusses important topics relevant to the industry. 

More detailed analysis follows in this comprehensive overview.`

    expect(htmlToMarkdown(html)).toBe(expected)
  })

  it('should handle empty input gracefully', () => {
    expect(htmlToMarkdown('')).toBe('')
    expect(htmlToMarkdown('<div></div>')).toBe('')
    expect(htmlToMarkdown('<p></p><div>   </div>')).toBe('')
  })

  it('should preserve word boundaries when text spans multiple lines', () => {
    const html = `
      <p>Expand into new markets
      in weeks, not months</p>
    `
    const expected = 'Expand into new markets in weeks, not months'
    expect(htmlToMarkdown(html)).toBe(expected)
  })
})
