import type { EmailQualityEnum, EmailResultEnum } from '@ritchy/types'
import { db } from '../../../db/db'

import { enrichmentEmail } from '../../../db/schema/enrichment'

type EmailQualityType = (typeof EmailQualityEnum.options)[number]
type EmailResultType = (typeof EmailResultEnum.options)[number]

export const insertEnrichmentEmail = async (
  enrichmentId: string,
  source: string,
  email: string,
  quality: EmailQualityType,
  result: EmailResultType,
  free: boolean,
  role: boolean,
): Promise<void> => {
  await db
    .insert(enrichmentEmail)
    .values({
      enrichment_id: enrichmentId,
      email,
      source,
      quality,
      result,
      free,
      role,
    })
    .onConflictDoNothing()
}
