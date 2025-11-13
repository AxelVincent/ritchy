import { db } from '../../../db/db'

import { eq } from 'drizzle-orm'
import {
  enrichment as enrichmentTable,
  place as placeTable,
} from '../../../db/schema'

export const getPlaceByEnrichmentId = async (enrichmentId: string) => {
  const place = await db
    .select({
      id: placeTable.id,
      source_id: placeTable.source_id,
      source: placeTable.source,
      source_url: placeTable.source_url,
      website: placeTable.website,
      name: placeTable.name,
    })
    .from(placeTable)
    .innerJoin(enrichmentTable, eq(placeTable.id, enrichmentTable.placeId))
    .where(eq(enrichmentTable.id, enrichmentId))
    .limit(1)
  return place[0]
}
