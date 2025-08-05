import { db } from 'apps/api/src/db/db'
import { contactEmail } from 'apps/api/src/db/schema'

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
