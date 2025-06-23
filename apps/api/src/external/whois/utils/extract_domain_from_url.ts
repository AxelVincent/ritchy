import { logger } from '@ritchy/logger'
import { z } from 'zod'

// URL validation schema with additional security checks
const UrlSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url)
        // Only allow http and https protocols
        return ['http:', 'https:'].includes(parsed.protocol)
      } catch {
        return false
      }
    },
    {
      message: 'Only HTTP and HTTPS protocols are allowed',
    },
  )
  .refine(
    (url) => {
      try {
        const parsed = new URL(url)
        // Prevent localhost and private IP ranges
        const hostname = parsed.hostname.toLowerCase()
        return !(
          hostname === 'localhost' ||
          hostname.startsWith('127.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('172.') ||
          hostname.includes('::1')
        )
      } catch {
        return false
      }
    },
    {
      message: 'Localhost and private IP addresses are not allowed',
    },
  )

/**
 * Extracts domain from URL with proper validation
 * @param url - The website URL
 * @returns The extracted domain
 */
export const extractDomainFromUrl = (url: string): string => {
  try {
    // Validate URL first
    const validatedUrl = UrlSchema.parse(url)

    // Extract domain using URL constructor for better reliability
    const parsedUrl = new URL(validatedUrl)
    const domain = parsedUrl.hostname
      .replace(/^www\./, '') // Remove www prefix
      .toLowerCase()

    return domain
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error({
        msg: 'URL validation failed',
        event: 'url_validation_error',
        metadata: {
          url,
          errors: error.errors.map((e) => ({
            path: e.path,
            message: e.message,
          })),
        },
      })
      throw new Error(
        `URL validation failed: ${error.errors[0]?.message || 'Invalid URL'}`,
      )
    }

    logger.error({
      msg: 'Failed to extract domain from URL',
      event: 'domain_extraction_error',
      metadata: {
        url,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw new Error(`Failed to extract domain from URL: ${url}`)
  }
}
