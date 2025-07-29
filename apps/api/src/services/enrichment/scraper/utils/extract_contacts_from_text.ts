import { extractEmail } from 'extract-email-address'
import { extractPhonesFromText } from '../../../../utils/phone_utils'

const BANNED_EMAIL_PATTERNS = [
  /@sentry\./i, // Matches any @sentry.* domain
  /@sentry-.*\./, // Matches @sentry-*.* domains
]

const extractEmails = (text: string): string[] => {
  const emails = extractEmail(text).map((email) => email.email)
  return emails.filter(
    (email) => !BANNED_EMAIL_PATTERNS.some((pattern) => pattern.test(email)),
  )
}

export const extractContactsFromText = (text: string) => {
  return {
    emails: extractEmails(text),
    phones: extractPhonesFromText(text),
  }
}
