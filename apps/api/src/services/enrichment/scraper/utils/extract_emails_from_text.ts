import { logger } from '@ritchy/logger'
import { z } from 'zod'

const DEFAULT_BANNED_EMAIL_PATTERNS = [
  /@sentry\./i, // Matches any @sentry.* domain
  /@sentry-.*\./, // Matches @sentry-*.* domains
  /@example\./, // Matches example.* domains
  /@test\./, // Matches test.* domains
  /noreply@/i, // Matches noreply emails
  /no-reply@/i, // Matches no-reply emails
  /\.local$/i, // Matches @company.local emails
]

// Basic email pattern to find potential emails in text (ASCII only)
const EMAIL_PATTERN =
  /([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)/g

// Simplified URL email pattern that matches any email after = in URL parameters
const URL_EMAIL_PATTERN = /[?&][^&=]*=([^&\s]+@[^&\s]+)/g

const findPotentialEmails = (text: string): string[] => {
  const directMatches = Array.from(text.matchAll(EMAIL_PATTERN), (m) => m[1])
  const urlMatches = Array.from(text.matchAll(URL_EMAIL_PATTERN), (m) => m[1])
  return [...new Set([...directMatches, ...urlMatches])].map(
    (email) =>
      email
        .replace(/^mailto:/, '')
        .replace(/['"]/g, '')
        .replace(/[<>]/g, '')
        .replace(/[;,]$/, '')
        .split('?')[0]
        .split('&')[0],
  )
}

// Email validation schema
const emailSchema = z.string().email()

/**
 * Extracts valid email addresses from a text string
 * @param text - The text to extract emails from
 * @returns Array of valid email addresses
 */
export const extractEmailsFromText = (text: string): string[] => {
  if (!text || typeof text !== 'string') {
    return []
  }

  try {
    // First find potential emails
    const potentialEmails = findPotentialEmails(text)

    // Validate emails using Zod
    const validEmails = potentialEmails.filter((email) => {
      try {
        emailSchema.parse(email.toLowerCase())
        return true
      } catch {
        return false
      }
    })

    // Apply banned patterns filter
    const filteredEmails = validEmails.filter(
      (email) =>
        !DEFAULT_BANNED_EMAIL_PATTERNS.some((pattern) => pattern.test(email)),
    )

    logger.debug({
      msg: 'Extracted emails from text',
      event: 'extracted_emails',
      metadata: {
        totalFound: validEmails.length,
        filteredCount: filteredEmails.length,
      },
    })

    return filteredEmails
  } catch (error) {
    logger.error({
      msg: 'Failed to extract emails from text',
      event: 'email_extraction_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
    return []
  }
}
