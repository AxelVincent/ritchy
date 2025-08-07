import { db } from '../../../db/db'
import { contactPhone, type phoneTypeEnum } from '../../../db/schema'

export const insertContactPhones = async (
  contactId: string,
  phones: { phone: string; type: (typeof phoneTypeEnum.enumValues)[number] }[],
) => {
  if (phones.length === 0) {
    return
  }

  await db
    .insert(contactPhone)
    .values(
      phones.map((phone) => ({
        ...phone,
        contactId,
      })),
    )
    .onConflictDoNothing()
}
