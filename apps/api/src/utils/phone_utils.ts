import { logger } from '@ritchy/logger'
import {
  type CountryCode,
  type NumberType,
  type PhoneNumber,
  findPhoneNumbersInText,
  parsePhoneNumberWithError,
} from 'libphonenumber-js'

// Get array of country codes from the CountryCode type
const VALID_COUNTRY_CODES = new Set<CountryCode>(
  Object.keys({} as Record<CountryCode, never>) as CountryCode[],
)

// Type guard to validate if a string is a valid CountryCode
function isValidCountryCode(code: string): code is CountryCode {
  return VALID_COUNTRY_CODES.has(code as CountryCode)
}

export interface ParsedPhoneResult {
  phoneNumber: PhoneNumber
  formattedPhone: string
  type: NumberType | 'FIXED_LINE_OR_MOBILE'
  country?: string
}

export const parseAndValidatePhone = (
  phone: string,
  countryCode?: string,
): ParsedPhoneResult | null => {
  try {
    let phoneNumber: PhoneNumber

    if (phone.startsWith('+')) {
      // Already in international format
      phoneNumber = parsePhoneNumberWithError(phone)
    } else if (countryCode && isValidCountryCode(countryCode)) {
      // Try parsing with provided country code
      phoneNumber = parsePhoneNumberWithError(phone, countryCode)
    } else {
      // Try to parse without country code - will throw if invalid
      phoneNumber = parsePhoneNumberWithError(phone)
    }

    // Validate the phone number
    if (!phoneNumber.isPossible()) {
      throw new Error('IMPOSSIBLE_NUMBER')
    }

    if (!phoneNumber.isValid()) {
      throw new Error('INVALID_NUMBER')
    }

    // Get the standardized international format
    const formattedPhone = phoneNumber.format('E.164')

    return {
      phoneNumber,
      formattedPhone,
      type: phoneNumber.getType() ?? 'FIXED_LINE_OR_MOBILE',
      country: phoneNumber.country,
    }
  } catch (error) {
    logger.warn({
      msg: 'Failed to parse phone number',
      event: 'phone_parse_error',
      metadata: {
        countryCode,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    return null
  }
}

export const extractPhonesFromText = (
  text: string,
  defaultCountry = 'FR',
): string[] => {
  // First try to find phone numbers with the built-in function
  const phoneObjects = findPhoneNumbersInText(text)
  const phones = phoneObjects.map((phone) => phone.number.number)

  // If no phones found, try parsing with specific country codes
  if (phones.length === 0) {
    // Clean the text by removing HTML tags and normalizing spaces
    const cleanText = text
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const parsedResult = parseAndValidatePhone(cleanText, defaultCountry)
    if (parsedResult) {
      phones.push(parsedResult.phoneNumber.number)
    }
  }

  // Filter out any numbers that are too short
  return phones.filter((phone) => phone.length > 5)
}
