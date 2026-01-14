import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import type * as schema from '../../../../db/schema'
import { enrichmentCompanyOfficerEmail } from '../../../../db/schema/enrichment'
import type { EmailQualityEnum, EmailResultEnum } from '../../../../shared'

type EmailQualityType = (typeof EmailQualityEnum.options)[number]
type EmailResultType = (typeof EmailResultEnum.options)[number]

export type InsertOfficerEmailData = {
  officer_id: string
  email: string
  role: boolean
  free: boolean
  source: string
  quality: EmailQualityType
  result: EmailResultType
  is_verified: boolean
}

/**
 * Pure query function to insert officer emails in batch
 */
export const insertEnrichmentCompanyOfficerEmails = async (
  emailsData: InsertOfficerEmailData[],
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<void> => {
  const dbOrTx = tx ?? db

  if (emailsData.length === 0) {
    return
  }

  await dbOrTx.insert(enrichmentCompanyOfficerEmail).values(emailsData)
}
