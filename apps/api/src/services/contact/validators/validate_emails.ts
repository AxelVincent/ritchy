/**
 * Validates email addresses
 * @param emails Array of email addresses to validate
 * @returns Array of valid email addresses
 */

export interface EmailValidationResult {
  email: string
  isValid: boolean
}

export const is_valid_email = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Check if email matches regex pattern
  if (!emailRegex.test(email)) {
    return false
  }

  return true
}

export const validate_emails = (emails: string[]): string[] => {
  return emails.filter(is_valid_email)
}
