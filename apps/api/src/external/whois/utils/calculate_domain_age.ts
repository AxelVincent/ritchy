/**
 * Calculates domain age in years from registration date
 * @param registrationDate - ISO string of registration date
 * @returns Domain age in years as integer, or null if invalid
 */
export const calculateDomainAge = (
  registrationDate: string | null,
): number | null => {
  if (!registrationDate || typeof registrationDate !== 'string') {
    return null
  }

  try {
    const regDate = new Date(registrationDate)
    const now = new Date()

    // Validate the date
    if (Number.isNaN(regDate.getTime())) {
      return null
    }

    // Calculate age in years using 365.25 days per year (accounts for leap years)
    const domainAge = Math.floor(
      (now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
    )

    // Return null for negative ages (future dates) or unreasonably old dates
    return domainAge >= 0 && domainAge <= 100 ? domainAge : null
  } catch {
    return null
  }
}
