import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { search } from '../../../db/schema'

export async function getSearchBySearchId(searchId: string) {
  const [searchDetails] = await db
    .select()
    .from(search)
    .where(eq(search.id, searchId))
    .limit(1)

  return searchDetails
}
