import { logger } from '@ritchy/logger'
import { DrizzleError } from 'drizzle-orm'
import {
  type CountryCode,
  type PhoneNumber,
  parsePhoneNumberWithError,
} from 'libphonenumber-js'
import { db } from '../../../db/db'
import { enrichmentPhone } from '../../../db/schema'
import { getBusinessCountryCodeByEnrichmentId } from './get_business_country_code'

// Get array of country codes from the CountryCode type
const VALID_COUNTRY_CODES = new Set<CountryCode>(
  Object.keys({} as Record<CountryCode, never>) as CountryCode[],
)

// Type guard to validate if a string is a valid CountryCode
function isValidCountryCode(code: string): code is CountryCode {
  return VALID_COUNTRY_CODES.has(code as CountryCode)
}

export const insertEnrichmentPhone = async (
  enrichmentId: string,
  phone: string,
) => {
  logger.info({
    msg: 'Inserting enrichment phone',
    event: 'inserting_enrichment_phone',
    metadata: { enrichmentId, phone },
  })

  const countryCode = await getBusinessCountryCodeByEnrichmentId(enrichmentId)

  try {
    // If the phone number doesn't start with '+' or '00', try to parse with country code
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
    const formattedPhone = phoneNumber.format('E.164') // Will be like +33582951555

    logger.info({
      msg: 'Phone parsed successfully',
      event: 'phone_parsed',
      metadata: {
        originalPhone: phone,
        formattedPhone,
        type: phoneNumber.getType(),
        country: phoneNumber.country,
      },
    })

    await db
      .insert(enrichmentPhone)
      .values({
        enrichmentId,
        type: phoneNumber.getType() ?? 'FIXED_LINE_OR_MOBILE',
        phone: formattedPhone,
      })
      .onConflictDoNothing()

    logger.info({
      msg: 'Enrichment phone inserted',
      event: 'enrichment_phone_inserted',
      metadata: { enrichmentId, phone: formattedPhone },
    })
  } catch (parseError) {
    logger.warn({
      msg: 'Failed to parse phone number',
      event: 'phone_parse_error',
      metadata: {
        enrichmentId,
        phone,
        countryCode,
        error:
          parseError instanceof Error ? parseError.message : String(parseError),
      },
    })

    // For failed parses, try to store the original number
    try {
      await db
        .insert(enrichmentPhone)
        .values({
          enrichmentId,
          type: 'FIXED_LINE_OR_MOBILE',
          phone,
        })
        .onConflictDoNothing()
    } catch (error) {
      // Handle unique constraint violation for unparsed numbers
      if (
        (error instanceof DrizzleError &&
          error.message.includes('duplicate key')) ||
        (error instanceof Error &&
          error.message.includes(
            'duplicate key value violates unique constraint',
          ))
      ) {
        logger.info({
          msg: 'Enrichment phone already exists (unparsed)',
          event: 'enrichment_phone_already_exists',
          metadata: { enrichmentId, phone },
        })
        return
      }
      throw error
    }
  }
}
