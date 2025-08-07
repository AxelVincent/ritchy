import { db } from '../../../db/db'
import { contactEmail } from '../../../db/schema'

export const insertContactEmails = async (
  contactId: string,
  emails: string[],
) => {
  if (emails.length === 0) {
    return
  }

  await db
    .insert(contactEmail)
    .values(
      emails.map((email) => ({
        contactId,
        email,
      })),
    )
    .onConflictDoNothing()
}
