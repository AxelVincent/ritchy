/**
 * Converts a camelCase or PascalCase string to Title Case with spaces
 * Handles numbers and "And" keyword properly
 */
export const toTitleCase = (str: string): string => {
  return str
    .split(/(?=[A-Z](?![0-9])|[0-9](?![0-9]))|(?:And)/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
