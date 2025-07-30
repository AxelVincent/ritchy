import type { CountryCode } from 'libphonenumber-js'
import { parsePhoneNumber } from 'libphonenumber-js'
import { COUNTRY_NAMES } from './country-names'

/**
 * Formats a phone number with country name for display
 * @param phoneNumber - The phone number to format
 * @param defaultCountry - Optional default country code (e.g., 'US', 'GB')
 * @returns Formatted string like "United States: +1 555 123 4567" or original if invalid
 */
export const formatPhoneNumberWithCountry = (
  phoneNumber: string,
  defaultCountry?: string,
): string => {
  if (!phoneNumber?.trim()) return ''

  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry as CountryCode)

    if (!parsed || !parsed.isValid()) {
      return phoneNumber
    }

    const countryCode = parsed.country
    if (!countryCode) {
      return parsed.formatInternational()
    }
    const countryName = COUNTRY_NAMES[countryCode]
    const formattedNumber = parsed.formatInternational()

    return countryName ? `${countryName}: ${formattedNumber}` : formattedNumber
  } catch {
    return phoneNumber
  }
}
