import { logger } from '@ritchy/logger'
import { SecureUrlSchema } from '@ritchy/types'
import { z } from 'zod'

/**
 * Extracts domain from URL with proper validation
 * @param url - The website URL
 * @returns The extracted domain
 */
export const extractDomainFromUrl = (url: string): string => {
  try {
    // Validate URL first using shared schema
    const validatedUrl = SecureUrlSchema.parse(url)

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
