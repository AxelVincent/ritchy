import { z } from 'zod'

/**
 * Validates email addresses using Zod's built-in email validator
 * @param emails Array of email addresses to validate
 * @returns Array of valid email addresses
 */

const emailSchema = z.string().email()

const is_valid_email = (email: string): boolean => {
  try {
    emailSchema.parse(email)
    return true
  } catch {
    return false
  }
}

export const validate_emails = (emails: string[]): string[] => {
  return emails.filter(is_valid_email)
}
