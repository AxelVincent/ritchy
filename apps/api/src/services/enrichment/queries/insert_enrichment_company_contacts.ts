import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import { enrichmentCompanyContact } from '../../../db/schema/enrichment'
import type { InternationalCompanyResponse } from '../../../external/pappers/international_company_v1'

type Contact = NonNullable<InternationalCompanyResponse['contacts']>[number]

/**
 * Pure query function to insert company contacts
 */
export const insertEnrichmentCompanyContacts = async (
  companyId: string,
  contacts: Contact[] | null | undefined,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<void> => {
  const dbOrTx = tx ?? db

  if (!contacts?.length) {
    return
  }

  await dbOrTx.insert(enrichmentCompanyContact).values(
    contacts.map((contact) => ({
      company_id: companyId,
      type: contact.type,
      value: contact.value ?? '',
    })),
  )
}
