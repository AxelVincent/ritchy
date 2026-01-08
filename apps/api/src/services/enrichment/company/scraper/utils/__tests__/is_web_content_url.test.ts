import { describe, expect, it } from 'vitest'
import { filterWebContentUrls, isWebContentUrl } from '../is_web_content_url'

describe('isWebContentUrl', () => {
  describe('should return false for non-web content', () => {
    it('should exclude PDFs', () => {
      expect(isWebContentUrl('https://example.com/document.pdf')).toBe(false)
      expect(isWebContentUrl('/files/brochure.pdf')).toBe(false)
    })

    it('should exclude images', () => {
      expect(isWebContentUrl('https://example.com/photo.jpg')).toBe(false)
      expect(isWebContentUrl('/images/logo.png')).toBe(false)
      expect(isWebContentUrl('https://cdn.example.com/banner.gif')).toBe(false)
      expect(isWebContentUrl('/assets/icon.svg')).toBe(false)
      expect(isWebContentUrl('https://example.com/photo.webp')).toBe(false)
      expect(isWebContentUrl('https://example.com/image.heic')).toBe(false)
      expect(isWebContentUrl('/favicon.ico')).toBe(false)
    })

    it('should exclude videos', () => {
      expect(isWebContentUrl('https://example.com/video.mp4')).toBe(false)
      expect(isWebContentUrl('/media/presentation.avi')).toBe(false)
      expect(isWebContentUrl('https://example.com/movie.mov')).toBe(false)
      expect(isWebContentUrl('/videos/demo.webm')).toBe(false)
    })

    it('should exclude audio files', () => {
      expect(isWebContentUrl('https://example.com/song.mp3')).toBe(false)
      expect(isWebContentUrl('/audio/podcast.wav')).toBe(false)
      expect(isWebContentUrl('https://example.com/music.flac')).toBe(false)
    })

    it('should exclude documents', () => {
      expect(isWebContentUrl('https://example.com/report.doc')).toBe(false)
      expect(isWebContentUrl('/files/spreadsheet.xlsx')).toBe(false)
      expect(isWebContentUrl('https://example.com/presentation.pptx')).toBe(
        false,
      )
      expect(isWebContentUrl('/documents/text.txt')).toBe(false)
      expect(isWebContentUrl('https://example.com/data.csv')).toBe(false)
    })

    it('should exclude archives', () => {
      expect(isWebContentUrl('https://example.com/files.zip')).toBe(false)
      expect(isWebContentUrl('/downloads/archive.rar')).toBe(false)
      expect(isWebContentUrl('https://example.com/backup.tar.gz')).toBe(false)
    })

    it('should exclude executables', () => {
      expect(isWebContentUrl('https://example.com/setup.exe')).toBe(false)
      expect(isWebContentUrl('/downloads/app.msi')).toBe(false)
      expect(isWebContentUrl('https://example.com/installer.dmg')).toBe(false)
    })

    it('should exclude fonts', () => {
      expect(isWebContentUrl('https://fonts.example.com/font.ttf')).toBe(false)
      expect(isWebContentUrl('/assets/font.woff2')).toBe(false)
      expect(isWebContentUrl('https://example.com/typeface.otf')).toBe(false)
    })

    it('should exclude other non-web formats', () => {
      expect(isWebContentUrl('https://example.com/data.xml')).toBe(false)
      expect(isWebContentUrl('/api/data.json')).toBe(false)
      expect(isWebContentUrl('https://example.com/feed.rss')).toBe(false)
      expect(isWebContentUrl('/sitemap.xml')).toBe(false)
    })
  })

  describe('should return true for web content', () => {
    it('should allow HTML pages', () => {
      expect(isWebContentUrl('https://example.com/page.html')).toBe(true)
      expect(isWebContentUrl('/about.htm')).toBe(true)
    })

    it('should allow server-side pages', () => {
      expect(isWebContentUrl('https://example.com/page.php')).toBe(true)
      expect(isWebContentUrl('/contact.asp')).toBe(true)
      expect(isWebContentUrl('https://example.com/form.aspx')).toBe(true)
      expect(isWebContentUrl('/search.jsp')).toBe(true)
    })

    it('should allow URLs without extensions', () => {
      expect(isWebContentUrl('https://example.com/about')).toBe(true)
      expect(isWebContentUrl('/contact')).toBe(true)
      expect(isWebContentUrl('https://example.com/products/category')).toBe(
        true,
      )
    })

    it('should allow root URLs', () => {
      expect(isWebContentUrl('https://example.com/')).toBe(true)
      expect(isWebContentUrl('/')).toBe(true)
    })

    it('should allow URLs with query parameters', () => {
      expect(isWebContentUrl('https://example.com/search?q=test')).toBe(true)
      expect(isWebContentUrl('/page?id=123')).toBe(true)
      // Still excludes non-web content even with query params
      expect(
        isWebContentUrl('https://example.com/document.pdf?download=false'),
      ).toBe(false)
    })

    it('should allow URLs with fragments', () => {
      expect(isWebContentUrl('https://example.com/page#section')).toBe(true)
      expect(isWebContentUrl('/about#team')).toBe(true)
      // Still excludes non-web content even with fragments
      expect(isWebContentUrl('https://example.com/photo.jpg#view')).toBe(false)
    })

    it('should handle edge cases gracefully', () => {
      expect(isWebContentUrl('')).toBe(false)
      expect(isWebContentUrl('not-a-url')).toBe(true) // Conservative approach
      expect(isWebContentUrl('https://example.com')).toBe(true) // No path
    })

    it('should handle URLs with dots in directory names', () => {
      expect(isWebContentUrl('https://example.com/v1.0/api')).toBe(true)
      expect(isWebContentUrl('/app.v2/dashboard')).toBe(true)
    })
  })
})

describe('filterWebContentUrls', () => {
  it('should filter out non-web content URLs', () => {
    const urls = [
      'https://example.com/about',
      'https://example.com/document.pdf',
      '/contact',
      '/images/logo.png',
      'https://example.com/page.html',
      '/files/archive.zip',
      '/products/category',
      'https://example.com/video.mp4',
    ]

    const filtered = filterWebContentUrls(urls)

    expect(filtered).toEqual([
      'https://example.com/about',
      '/contact',
      'https://example.com/page.html',
      '/products/category',
    ])
  })

  it('should handle empty array', () => {
    expect(filterWebContentUrls([])).toEqual([])
  })

  it('should handle array with only non-web content', () => {
    const urls = [
      'https://example.com/document.pdf',
      '/images/logo.png',
      '/files/archive.zip',
    ]

    expect(filterWebContentUrls(urls)).toEqual([])
  })

  it('should handle array with only web content', () => {
    const urls = [
      'https://example.com/about',
      '/contact',
      'https://example.com/page.html',
    ]

    expect(filterWebContentUrls(urls)).toEqual(urls)
  })
})
