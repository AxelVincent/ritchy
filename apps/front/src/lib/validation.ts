/**
 * Validation utilities for security and data integrity
 */

/**
 * UUID v4 regex pattern
 * Matches: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hexadecimal digit and y is one of 8, 9, A, or B
 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validates if a string is a valid UUID v4 format.
 *
 * @param id - The string to validate
 * @returns true if valid UUID v4, false otherwise
 *
 * @example
 * ```typescript
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000') // true
 * isValidUUID('not-a-uuid') // false
 * isValidUUID(''; DROP TABLE users; --') // false
 * ```
 */
export const isValidUUID = (id: string): boolean => {
  return UUID_V4_REGEX.test(id)
}

/**
 * Validates an array of UUIDs, filtering out invalid ones.
 *
 * @param ids - Array of strings to validate
 * @returns Array containing only valid UUIDs
 *
 * @example
 * ```typescript
 * validateUUIDs(['valid-uuid', 'invalid', 'another-valid'])
 * // Returns: ['valid-uuid', 'another-valid']
 * ```
 */
export const validateUUIDs = (ids: string[]): string[] => {
  const valid = ids.filter(isValidUUID)

  if (valid.length !== ids.length) {
    const invalid = ids.filter((id) => !isValidUUID(id))
    console.warn('Invalid UUIDs filtered out:', invalid)
  }

  return valid
}

/**
 * Asserts that all IDs in an array are valid UUIDs, throwing if any are invalid.
 *
 * @param ids - Array of strings to validate
 * @throws Error if any ID is invalid
 *
 * @example
 * ```typescript
 * assertValidUUIDs(['valid-uuid']) // passes
 * assertValidUUIDs(['invalid']) // throws Error
 * ```
 */
export const assertValidUUIDs = (ids: string[]): void => {
  const invalid = ids.filter((id) => !isValidUUID(id))

  if (invalid.length > 0) {
    throw new Error(
      `Invalid UUIDs detected: ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? '...' : ''}`,
    )
  }
}
