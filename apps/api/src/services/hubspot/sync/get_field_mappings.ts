import { and, eq, like, sql } from 'drizzle-orm'
import { db } from '../../../db/db'
import { hubspotFieldMapping } from '../../../db/schema'

export const getFieldMappings = async (
  tokenId: string,
  fieldType: 'contact' | 'company',
) => {
  const mappings = await db
    .select()
    .from(hubspotFieldMapping)
    .where(
      and(
        eq(hubspotFieldMapping.tokenId, tokenId),
        like(sql`${hubspotFieldMapping.internalField}::text`, `${fieldType}.%`),
      ),
    )

  return mappings
}
