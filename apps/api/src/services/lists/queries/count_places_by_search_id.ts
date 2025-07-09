import { eq, sql } from 'drizzle-orm'
import { db } from '../../../db/db'
import { listPlace } from '../../../db/schema'

export async function countPlacesBySearchId(searchId: string) {
  const [count] = await db
    .select({ count: sql`COUNT(*)` })
    .from(listPlace)
    .where(eq(listPlace.searchId, searchId))

  return count
}
