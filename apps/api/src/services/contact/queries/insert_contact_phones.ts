import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contactPhone, type phoneTypeEnum } from '../../../db/schema'
import type * as schema from '../../../db/schema'

export const insertContactPhones = async (
  contactId: string,
  phones: { phone: string; type: (typeof phoneTypeEnum.enumValues)[number] }[],
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  if (phones.length === 0) {
    return
  }

  await dbOrTx
    .insert(contactPhone)
    .values(
      phones.map((phone) => ({
        ...phone,
        contactId,
      })),
    )
    .onConflictDoNothing()
}
