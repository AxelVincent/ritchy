/**
 * Extracts a meaningful error message from any error type.
 *
 * BullMQ serializes errors across processes/threads, which means Error instances
 * become plain objects when deserialized. This utility handles:
 * - Standard Error instances
 * - Deserialized error objects (with message property)
 * - Plain objects (stringified)
 * - Strings
 * - Unknown types
 */
export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null) {
    // BullMQ deserializes errors as plain objects with message property
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }
    // Try to extract meaningful info from the object
    try {
      return JSON.stringify(error)
    } catch {
      return 'Unknown error (object)'
    }
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Unknown error'
}

/**
 * Converts any error to a proper Error instance.
 *
 * Useful when you need to throw a proper Error but received
 * a deserialized error object from BullMQ.
 *
 * @internal Currently unused - kept for potential future use
 */
const _toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error
  }
  return new Error(extractErrorMessage(error))
}

// Suppress unused variable warning - kept for potential future use
void _toError
