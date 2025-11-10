import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import { enrichmentCompanyActivity } from '../../../db/schema/enrichment'
import type { InternationalCompanyResponse } from '../../../external/pappers/international_company_v1'

type Activity = NonNullable<InternationalCompanyResponse['activities']>[number]
type LocalActivity = NonNullable<
  InternationalCompanyResponse['local_activities']
>[number]

/**
 * Pure query function to insert company activities (both standard and local)
 */
export const insertEnrichmentCompanyActivities = async (
  companyId: string,
  activities: Activity[] | null | undefined,
  localActivities: LocalActivity[] | null | undefined,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<void> => {
  const dbOrTx = tx ?? db

  // Insert standard activities if present
  if (activities?.length) {
    await dbOrTx.insert(enrichmentCompanyActivity).values(
      activities.map((activity) => ({
        company_id: companyId,
        code: activity.code,
        name: activity.name,
        type: 'standard' as const,
      })),
    )
  }

  // Insert local activities if present
  if (localActivities?.length) {
    await dbOrTx.insert(enrichmentCompanyActivity).values(
      localActivities.map((activity) => ({
        company_id: companyId,
        code: activity.code,
        name: activity.name,
        type: 'local' as const,
        classification: activity.classification,
      })),
    )
  }
}
