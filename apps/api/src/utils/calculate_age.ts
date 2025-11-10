/**
 * Calculate current age from a birth date
 * Handles edge cases like birthdays not yet occurred in current year
 *
 * @param birthDate - Date of birth
 * @returns Current age in years
 *
 * @example
 * const birthDate = new Date('1990-03-15')
 * const age = calculateAge(birthDate) // Returns current age
 */
export const calculateAge = (birthDate: Date): number => {
  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  // Adjust if birthday hasn't occurred yet this year
  const adjustedAge =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ? age - 1
      : age

  return adjustedAge
}

/**
 * Format date of birth with calculated age
 *
 * @param birthDate - Date of birth
 * @returns Formatted string like "1990-03-15 (Age: 34)"
 *
 * @example
 * const birthDate = new Date('1990-03-15')
 * const formatted = formatDateOfBirthWithAge(birthDate)
 * // Returns: "1990-03-15 (Age: 34)"
 */
export const formatDateOfBirthWithAge = (birthDate: Date): string => {
  const age = calculateAge(birthDate)
  const dateStr = birthDate.toISOString().split('T')[0]
  return `${dateStr} (Age: ${age})`
}
