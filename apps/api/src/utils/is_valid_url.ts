import { isValidUrl as zodIsValidUrl } from '@ritchy/types'

/**
 * Validates if a string is a valid URL
 * Uses Zod schema for consistent validation across the codebase
 *
 * @param url - The URL string to validate
 * @returns true if the URL is valid, false otherwise
 */
export const isValidUrl = (url: string): boolean => {
  return zodIsValidUrl(url)
}
