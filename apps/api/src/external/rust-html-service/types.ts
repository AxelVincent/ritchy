/**
 * Request body for the Rust HTML processing service
 */
export interface ProcessHtmlRequest {
  /** Pre-processed HTML from scraper (required) */
  html: string
  /** Unprocessed HTML for technology detection (optional) */
  rawHtml?: string
  /** Page URL for link resolution (required) */
  url: string
  /** Processing options */
  options?: ProcessOptions
}

/**
 * Options to control which extraction operations to perform
 */
export interface ProcessOptions {
  /** Extract email and phone contacts (default: true) */
  extractContacts?: boolean
  /** Extract internal and social links (default: true) */
  extractLinks?: boolean
  /** Extract script URLs, meta tags, iframes (default: true) */
  extractScripts?: boolean
  /** Convert HTML to markdown (default: true) */
  convertToMarkdown?: boolean
}

/**
 * Successful response from the Rust HTML processing service
 */
export interface ProcessHtmlResponse {
  success: true
  data: ProcessedData
  metadata: ProcessMetadata
}

/**
 * Error response from the Rust HTML processing service
 */
export interface ProcessHtmlErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/**
 * Union type for all possible responses
 */
export type ProcessHtmlResult = ProcessHtmlResponse | ProcessHtmlErrorResponse

/**
 * Main data payload containing all extracted information
 */
export interface ProcessedData {
  /** Markdown content for RAG indexing */
  markdown: string
  /** Extracted contact information */
  contacts: ExtractedContacts
  /** Extracted links categorized by type */
  links: ExtractedLinks
  /** Technology signals (scripts, meta tags, iframes) */
  scripts: ExtractedScript[]
}

/**
 * Contact information extracted from the page
 */
export interface ExtractedContacts {
  emails: string[]
  phones: string[]
}

/**
 * Links extracted and categorized from the page
 */
export interface ExtractedLinks {
  /** Internal links (same domain) */
  internal: string[]
  /** Social media links */
  social: SocialLinks
}

/**
 * Social media links by platform
 */
export interface SocialLinks {
  instagram: InstagramLink[]
  facebook: FacebookLink[]
  linkedin: LinkedinLink[]
}

export interface InstagramLink {
  url: string
  username: string
}

export interface FacebookLink {
  url: string
  username: string
}

export interface LinkedinLink {
  url: string
  name: string
  type: 'personal' | 'company'
}

/**
 * Technology signal extracted from the page
 */
export interface ExtractedScript {
  type: 'script_url' | 'inline_code' | 'meta_tag' | 'iframe'
  value: string
}

/**
 * Metadata about the processing operation
 */
export interface ProcessMetadata {
  /** Time taken to process in milliseconds */
  processingTimeMs: number
  /** Size of input HTML in bytes */
  htmlSizeBytes: number
  /** Size of output markdown in bytes */
  markdownSizeBytes: number
}
