import TurndownService from 'turndown'

/**
 * Create a configured TurndownService instance with all rules.
 * Rules are added once at creation time to avoid memory leaks.
 */
const createTurndownService = () => {
  const service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    strongDelimiter: '**',
    emDelimiter: '*',
  })

  // Handle BR tags to preserve word boundaries
  service.addRule('brTags', {
    filter: 'br',
    replacement: () => ' ',
  })

  // Remove noise elements that don't add semantic value
  service.addRule('removeNoise', {
    filter: ['script', 'style', 'nav', 'header', 'footer', 'aside', 'meta'],
    replacement: () => '',
  })

  // Remove empty paragraphs and whitespace-only content
  service.addRule('removeEmpty', {
    filter: (node) => {
      const isEmpty = !node.textContent?.trim()
      const isEmptyParagraph = node.nodeName === 'P' && isEmpty
      return isEmptyParagraph || isEmpty
    },
    replacement: () => '',
  })

  // Flatten nested structures for better vectorization
  service.addRule('flattenDivs', {
    filter: 'div',
    replacement: (content) => (content.trim() ? `${content}\n\n` : ''),
  })

  // Structured headers with consistent spacing
  service.addRule('structuredHeaders', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: (content, node) => {
      const level = Number(node.nodeName.charAt(1))
      const cleanContent = content.trim()
      return cleanContent ? `\n${'#'.repeat(level)} ${cleanContent}\n\n` : ''
    },
  })

  // Clean lists for better semantic understanding
  service.addRule('cleanLists', {
    filter: ['ul', 'ol'],
    replacement: (content) => {
      const cleanContent = content.trim()
      return cleanContent ? `\n${cleanContent}\n\n` : ''
    },
  })

  // Preserve important semantic elements
  service.addRule('semanticElements', {
    filter: ['strong', 'em', 'b', 'i'],
    replacement: (content, node) => {
      if (!content.trim()) return ''
      const tag = node.nodeName.toLowerCase()
      return tag === 'strong' || tag === 'b' ? `**${content}**` : `*${content}*`
    },
  })

  return service
}

export const htmlToMarkdown = (html: string) => {
  const turndownService = createTurndownService()
  let markdown = turndownService.turndown(html)

  // Optimize for vectorization
  markdown = markdown
    // Normalize spacing for consistent chunking
    .replace(/\n{3,}/g, '\n\n')
    // Remove excessive punctuation that doesn't add semantic value
    .replace(/[.]{3,}/g, '...')
    // Clean up list formatting
    .replace(/^[\s]*[-*+]\s*/gm, '- ')
    // Remove leading/trailing whitespace from lines
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    // Ensure sentences end properly for better chunking
    .replace(/([a-zA-Z0-9])([.!?])(\s*[A-Z])/g, '$1$2 $3')
    // Remove extra spaces
    .replace(/ {2,}/g, ' ')
    // Clean up final formatting
    .trim()

  // Split into semantic chunks and rejoin (removes very short lines)
  const lines = markdown.split('\n')
  const meaningfulLines = lines.filter((line) => {
    const trimmed = line.trim()
    // Keep headers, lists, and substantial content
    return (
      trimmed.startsWith('#') ||
      trimmed.startsWith('-') ||
      trimmed.length > 10 ||
      trimmed === ''
    ) // Keep spacing lines
  })

  return meaningfulLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
