import { type InferSelectModel, eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { search } from '../../../db/schema'

export async function updateSearchById(
  searchId: string,
  data: Partial<InferSelectModel<typeof search>>,
) {
  await db.update(search).set(data).where(eq(search.id, searchId))
}
