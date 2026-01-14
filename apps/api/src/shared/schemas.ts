import { z } from 'zod'

/**
 * Basic URL validation schema
 * Validates URL format and allows http/https protocols
 */
export const UrlSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url)
        return ['http:', 'https:'].includes(parsed.protocol)
      } catch {
        return false
      }
    },
    {
      message: 'Only HTTP and HTTPS protocols are allowed',
    },
  )

/**
 * Strict URL validation schema with security checks
 * Prevents localhost and private IP addresses
 */
export const SecureUrlSchema = UrlSchema.refine(
  (url) => {
    try {
      const parsed = new URL(url)
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
 * Simple URL validation function using Zod
 * Returns true if URL is valid, false otherwise
 */
export const isValidUrl = (url: string): boolean => {
  return UrlSchema.safeParse(url).success
}

/**
 * Secure URL validation function using Zod
 * Returns true if URL is valid and secure, false otherwise
 */
export const isValidSecureUrl = (url: string): boolean => {
  return SecureUrlSchema.safeParse(url).success
}
