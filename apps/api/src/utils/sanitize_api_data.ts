// Utility function to sanitize text fields
function sanitizeText(value: string | null | undefined): string {
  if (!value) return ''

  return (
    value
      .replace(/\0/g, '') // Remove null terminators
      // biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
      .trim()
  ) // Remove leading/trailing whitespace
}

// Recursive sanitization for complex objects
function deepSanitize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj

  if (typeof obj === 'string') {
    return sanitizeText(obj) as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepSanitize(item)) as T
  }

  if (typeof obj === 'object') {
    const result = {} as T
    for (const [key, value] of Object.entries(obj)) {
      ;(result as Record<string, unknown>)[key] = deepSanitize(value)
    }
    return result
  }

  return obj
}

/**
 * Sanitizes API data to ensure it meets validation requirements
 * Also removes null terminators and control characters
 * This is important to prevent SQL injection and other security vulnerabilities
 *
 * @param data - Raw API data to sanitize
 * @returns Sanitized API data
 */
export function sanitizeApiData(data: unknown) {
  return deepSanitize(data)
}
