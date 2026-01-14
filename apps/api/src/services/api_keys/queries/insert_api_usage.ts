import { db } from '../../../db/db'
import { type NewApiUsage, apiUsage } from '../../../db/schema'

export const insertApiUsage = async (
  usage: Omit<NewApiUsage, 'id' | 'createdAt'>,
): Promise<void> => {
  await db.insert(apiUsage).values(usage)
}
