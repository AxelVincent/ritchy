import { logger } from '@ritchy/logger'
import {
  type ValidateDemoCodeApiResponse,
  type ValidateDemoCodeRequest,
  ValidateDemoCodeRequestSchema,
} from '@ritchy/types'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { userDemoCode } from '../../db/schema'

export const validateDemoCodeHandler = async (
  req: Request<
    Record<string, never>,
    ValidateDemoCodeApiResponse,
    ValidateDemoCodeRequest
  >,
  res: Response<ValidateDemoCodeApiResponse>,
): Promise<void> => {
  try {
    const parsedBody = ValidateDemoCodeRequestSchema.parse(req.body)
    const { code: submittedCode } = parsedBody
    const userId = req.auth.userId

    if (!userId) {
      logger.warn({
        msg: 'User ID missing in validateDemoCodeHandler',
        event: 'validate_demo_code_no_userid',
      })
      res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'User not authenticated.',
      })
      return
    }

    const [demoCodeRecord] = await db
      .select()
      .from(userDemoCode)
      .where(eq(userDemoCode.userId, userId))

    if (!demoCodeRecord) {
      logger.warn({
        msg: 'No demo code record found for user',
        event: 'validate_demo_code_no_record',
        metadata: { userId },
      })
      res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'Demo code record not found for this user.',
      })
      return
    }

    if (demoCodeRecord.isValidated) {
      logger.info({
        msg: 'Demo code already validated for user',
        event: 'demo_code_already_validated',
        metadata: { userId },
      })
      res.json({
        success: true,
        message: 'Demo code has already been validated.',
      })
      return
    }

    if (demoCodeRecord.code === submittedCode.toUpperCase()) {
      await db
        .update(userDemoCode)
        .set({ isValidated: true, validatedAt: new Date() })
        .where(eq(userDemoCode.id, demoCodeRecord.id))

      logger.info({
        msg: 'Demo code validated successfully',
        event: 'demo_code_validated',
        metadata: { userId },
      })
      res.json({ success: true })
    } else {
      logger.warn({
        msg: 'Invalid demo code attempt',
        event: 'invalid_demo_code_attempt',
        metadata: { userId, submittedCode },
      })
      res.status(400).json({
        success: false,
        error: 'invalid_code',
        message: 'The submitted code is incorrect.',
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Validation error for demo code endpoint',
        event: 'validation_error_demo_code_endpoint',
        metadata: { error: error.flatten(), userId: req.auth?.userId },
      })
      res.status(400).json({
        error: 'bad_request',
        message: 'Invalid request data.',
        details: error.errors,
      })
      return
    }

    logger.error({
      msg: 'Error validating demo code',
      event: 'validate_demo_code_error_handler',
      metadata: { error, userId: req.auth?.userId },
    })
    res.status(500).json({
      error: 'internal_server_error',
      message: 'An unexpected error occurred while validating the demo code.',
    })
  }
}
