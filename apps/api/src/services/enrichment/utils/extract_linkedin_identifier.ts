import { logger } from '@ritchy/logger'

/**
 * Result type for LinkedIn identifier extraction
 */
export type LinkedInIdentifierResult =
  | {
      success: true
      identifier: string
      originalUrl: string
    }
  | {
      success: false
      error: LinkedInExtractionError
      originalUrl: string
    }

/**
 * Specific error types for LinkedIn extraction failures
 */
export type LinkedInExtractionError =
  | { type: 'invalid_url'; message: string }
  | { type: 'invalid_path'; message: string; path: string }
  | { type: 'invalid_identifier'; message: string; identifier: string }
  | { type: 'unsupported_profile_type'; message: string; profileType: string }

/**
 * Extracts LinkedIn public identifier from a LinkedIn profile URL
 *
 * Handles various LinkedIn URL formats:
 * - https://www.linkedin.com/in/john-doe-123456/
 * - https://linkedin.com/in/jane-smith/
 * - http://www.linkedin.com/in/bob-jones
 *
 * Validates:
 * - URL format
 * - Profile type (only /in/ paths for personal profiles)
 * - Identifier format (alphanumeric + hyphens)
 *
 * @param url - The LinkedIn profile URL
 * @returns Result object with identifier or error details
 *
 * @example
 * const result = extractLinkedInIdentifier('https://linkedin.com/in/john-doe-123456/')
 * if (result.success) {
 *   console.log(result.identifier) // "john-doe-123456"
 * } else {
 *   console.error(result.error.type, result.error.message)
 * }
 */
export const extractLinkedInIdentifier = (
  url: string,
): LinkedInIdentifierResult => {
  // Parse URL
  let urlObj: URL
  try {
    urlObj = new URL(url)
  } catch (_error) {
    return {
      success: false,
      error: {
        type: 'invalid_url',
        message: 'Failed to parse URL',
      },
      originalUrl: url,
    }
  }

  // Validate hostname
  const validHostnames = ['linkedin.com', 'www.linkedin.com']
  if (!validHostnames.includes(urlObj.hostname.toLowerCase())) {
    return {
      success: false,
      error: {
        type: 'invalid_url',
        message: `Invalid LinkedIn hostname: ${urlObj.hostname}`,
      },
      originalUrl: url,
    }
  }

  // Parse pathname
  const pathParts = urlObj.pathname.split('/').filter(Boolean)

  if (pathParts.length < 2) {
    return {
      success: false,
      error: {
        type: 'invalid_path',
        message: 'URL path too short',
        path: urlObj.pathname,
      },
      originalUrl: url,
    }
  }

  const profileType = pathParts[0]
  const identifier = pathParts[1]

  // Only accept personal profile URLs (/in/)
  // Reject company pages (/company/), schools (/school/), etc.
  if (profileType !== 'in') {
    return {
      success: false,
      error: {
        type: 'unsupported_profile_type',
        message: `Only personal profiles (/in/) are supported. Got: /${profileType}/`,
        profileType,
      },
      originalUrl: url,
    }
  }

  // Validate identifier format
  // LinkedIn identifiers are alphanumeric with hyphens, typically lowercase
  // Examples: john-doe-123456, jane-smith, bob-jones-mba
  const identifierRegex = /^[a-z0-9-]+$/i

  if (!identifierRegex.test(identifier)) {
    return {
      success: false,
      error: {
        type: 'invalid_identifier',
        message:
          'Identifier contains invalid characters (only alphanumeric and hyphens allowed)',
        identifier,
      },
      originalUrl: url,
    }
  }

  // Additional validation: identifier should be reasonable length (3-100 chars)
  if (identifier.length < 3 || identifier.length > 100) {
    return {
      success: false,
      error: {
        type: 'invalid_identifier',
        message: `Identifier length out of range (${identifier.length} chars, expected 3-100)`,
        identifier,
      },
      originalUrl: url,
    }
  }

  // Success!
  logger.debug({
    msg: '[extract_linkedin_identifier] Successfully extracted identifier',
    event: 'linkedin_identifier_extracted',
    metadata: {
      originalUrl: url,
      identifier,
    },
  })

  return {
    success: true,
    identifier,
    originalUrl: url,
  }
}

/**
 * Type guard to check if extraction was successful
 */
export const isSuccessfulExtraction = (
  result: LinkedInIdentifierResult,
): result is Extract<LinkedInIdentifierResult, { success: true }> => {
  return result.success === true
}
