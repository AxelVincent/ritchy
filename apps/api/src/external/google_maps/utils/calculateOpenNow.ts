import type { OpeningHours } from '@ritchy/types'

/**
 * Calculates whether a place is currently open based on its opening hours
 * and the current time in the place's timezone.
 *
 * @param openingHours The opening hours data from Google Maps
 * @param utcOffsetMinutes The UTC offset in minutes for the place's location
 * @returns boolean indicating if the place is currently open
 */
export const calculateOpenNow = (
  openingHours?: OpeningHours,
  utcOffsetMinutes = 0,
): boolean => {
  if (!openingHours?.periods || openingHours.periods.length === 0) {
    return false
  }

  // Check for 24/7 open places (period with open but no close)
  for (const period of openingHours.periods) {
    if (period.open && !period.close) {
      return true
    }
  }

  // Get current date and time in the place's timezone
  const now = new Date()
  // Apply UTC offset to get local time at the place
  const localTime = new Date(now.getTime() + utcOffsetMinutes * 60 * 1000)

  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const currentDay = localTime.getUTCDay()
  // Get current hour and minute
  const currentHour = localTime.getUTCHours()
  const currentMinute = localTime.getUTCMinutes()

  // Convert current time to minutes for easier comparison
  const currentTimeInMinutes = currentHour * 60 + currentMinute

  // Check if the place is currently open
  for (const period of openingHours.periods) {
    // Skip periods without both open and close times
    if (!period.open || !period.close) {
      continue
    }

    const openDay = period.open.day
    const openHour = period.open.hour
    const openMinute = period.open.minute || 0 // Ensure minute is defined
    const openTimeInMinutes = openHour * 60 + openMinute

    const closeDay = period.close.day
    const closeHour = period.close.hour
    const closeMinute = period.close.minute || 0 // Ensure minute is defined
    const closeTimeInMinutes = closeHour * 60 + closeMinute

    // Handle same-day period
    if (openDay === closeDay && currentDay === openDay) {
      if (
        currentTimeInMinutes >= openTimeInMinutes &&
        currentTimeInMinutes < closeTimeInMinutes
      ) {
        return true
      }
    }
    // Handle overnight period (closing time is on the next day)
    else if ((openDay + 1) % 7 === closeDay) {
      if (currentDay === openDay && currentTimeInMinutes >= openTimeInMinutes) {
        return true
      }
      if (
        currentDay === closeDay &&
        currentTimeInMinutes < closeTimeInMinutes
      ) {
        return true
      }
    }
  }

  return false
}
