import { logger } from '@ritchy/logger'
import { DrizzleError } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichmentPhone } from '../../../db/schema'
import {
  type ParsedPhoneResult,
  parseAndValidatePhone,
} from '../../../utils/phone_utils'
import { getBusinessCountryCodeByEnrichmentId } from './get_business_country_code'

export const insertEnrichmentPhone = async (
  enrichmentId: string,
  source: string,
  phone: string,
) => {
  logger.info({
    msg: 'Inserting enrichment phone',
    event: 'inserting_enrichment_phone',
    metadata: { enrichmentId, phone },
  })

  const countryCode = await getBusinessCountryCodeByEnrichmentId(enrichmentId)
  let parsedResult: ParsedPhoneResult | null = null
  if (!countryCode) {
    parsedResult = parseAndValidatePhone(phone)
  } else {
    parsedResult = parseAndValidatePhone(phone, countryCode)
  }

  if (parsedResult) {
    logger.info({
      msg: 'Phone parsed successfully',
      event: 'phone_parsed',
      metadata: {
        originalPhone: phone,
        formattedPhone: parsedResult.formattedPhone,
        type: parsedResult.type,
        country: parsedResult.country,
      },
    })

    try {
      await db
        .insert(enrichmentPhone)
        .values({
          enrichmentId,
          type: parsedResult.type ?? 'FIXED_LINE_OR_MOBILE',
          phone: parsedResult.phoneNumber.format('E.164'),
          source,
        })
        .onConflictDoNothing()

      logger.info({
        msg: 'Enrichment phone inserted',
        event: 'enrichment_phone_inserted',
        metadata: { enrichmentId, phone: parsedResult.formattedPhone },
      })
    } catch (error) {
      handleDatabaseError(error, enrichmentId, parsedResult.formattedPhone)
    }
  } else {
    // For failed parses, try to store the original number
    try {
      await db
        .insert(enrichmentPhone)
        .values({
          enrichmentId,
          type: 'FIXED_LINE_OR_MOBILE',
          phone,
          source,
        })
        .onConflictDoNothing()
    } catch (error) {
      handleDatabaseError(error, enrichmentId, phone)
    }
  }
}

const handleDatabaseError = (
  error: unknown,
  enrichmentId: string,
  phone: string,
) => {
  if (
    (error instanceof DrizzleError &&
      error.message.includes('duplicate key')) ||
    (error instanceof Error &&
      error.message.includes('duplicate key value violates unique constraint'))
  ) {
    logger.info({
      msg: 'Enrichment phone already exists',
      event: 'enrichment_phone_already_exists',
      metadata: { enrichmentId, phone },
    })
    return
  }
  throw error
}
