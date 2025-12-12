import { logger } from '@ritchy/logger'
import type {
  CreateContactApiResponse,
  CreateContactRequest,
} from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../db/db'
import { userPlace } from '../../db/schema'
import { insertContact } from '../../services/contact/queries/insert_contact'
import { updateLastInteraction } from '../../services/places/utils/update_last_interaction'

export const createContactHandler = async (
  req: Request<
    Record<string, never>,
    CreateContactApiResponse,
    CreateContactRequest
  >,
  res: Response<CreateContactApiResponse>,
): Promise<void> => {
  try {
    const { placeId, firstName, lastName, type } = req.body
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      })
      return
    }

    logger.info({
      msg: '[POST /contacts] Creating contact',
      event: 'creating_contact',
      metadata: { placeId, firstName, lastName, type, userId },
    })

    // Verify user owns this place
    const placeResult = await db
      .select({ id: userPlace.id })
      .from(userPlace)
      .where(and(eq(userPlace.id, placeId), eq(userPlace.user_id, userId)))
      .limit(1)

    if (!placeResult.length) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to add contacts to this place',
      })
      return
    }

    // Insert the contact
    const newContact = await insertContact({
      type,
      officerId: null, // Manual contacts are not linked to enrichment officers
      userPlaceId: placeId,
      firstName,
      lastName: lastName ?? null,
      isPrimary: false, // New manual contacts are not primary by default
    })

    await updateLastInteraction(placeId)

    logger.info({
      msg: '[POST /contacts] Contact created successfully',
      event: 'contact_created',
      metadata: { contactId: newContact.id },
    })

    res.status(201).json({
      id: newContact.id,
      firstName: newContact.firstName ?? '',
      lastName: newContact.lastName,
      type: newContact.type ?? 'physical',
      isPrimary: newContact.isPrimary,
    })
  } catch (error) {
    logger.error({
      msg: '[POST /contacts] Failed to create contact',
      event: 'failed_to_create_contact',
      metadata: { error },
    })
    res.status(500).json({
      error: 'InternalServerError',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
