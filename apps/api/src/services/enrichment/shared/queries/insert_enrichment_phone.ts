import { logger } from '@ritchy/logger'
import { DrizzleError } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { enrichmentPhone } from '../../../../db/schema'
import { parseAndValidatePhone } from '../../../../utils/phone_utils'

export const insertEnrichmentPhone = async (
  userPlaceId: string,
  enrichmentId: string,
  source: string,
  phone: string,
) => {
  logger.debug({
    msg: 'Inserting enrichment phone',
    event: 'inserting_enrichment_phone',
    metadata: { userPlaceId, enrichmentId, source, phone },
  })

  const parsedResult = parseAndValidatePhone(phone)

  if (parsedResult) {
    logger.debug({
      msg: 'Phone parsed successfully',
      event: 'phone_parsed',
      metadata: {
        userPlaceId,
        enrichmentId,
        source,
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

      logger.debug({
        msg: 'Enrichment phone inserted',
        event: 'enrichment_phone_inserted',
        metadata: {
          userPlaceId,
          enrichmentId,
          source,
          phone: parsedResult.formattedPhone,
        },
      })
    } catch (error) {
      if (
        (error instanceof DrizzleError &&
          error.message.includes('duplicate key')) ||
        (error instanceof Error &&
          error.message.includes(
            'duplicate key value violates unique constraint',
          ))
      ) {
        logger.info({
          msg: 'Enrichment phone already exists',
          event: 'enrichment_phone_already_exists',
          metadata: {
            userPlaceId,
            enrichmentId,
            source,
            phone: parsedResult.formattedPhone,
          },
        })
        return
      }
      throw error
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
      if (
        (error instanceof DrizzleError &&
          error.message.includes('duplicate key')) ||
        (error instanceof Error &&
          error.message.includes(
            'duplicate key value violates unique constraint',
          ))
      ) {
        logger.info({
          msg: 'Enrichment phone already exists',
          event: 'enrichment_phone_already_exists',
          metadata: { userPlaceId, enrichmentId, source, phone },
        })
        return
      }
      logger.error({
        msg: 'Failed to insert enrichment phone',
        event: 'failed_to_insert_enrichment_phone',
        metadata: { userPlaceId, enrichmentId, source, phone, error },
      })
      throw error
    }
  }
}
