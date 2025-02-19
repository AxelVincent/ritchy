import 'dotenv/config'
import { count, eq, isNull, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
const { Pool } = pg
import { createClerkClient } from '@clerk/backend'
import { logger } from '@ritchy/logger'
import { z } from 'zod'
import { CLERK_CONFIG } from '../config/clerk'
import { list, note, search, user as userTable } from '../db/schema'

const userSchema = z.object({
  id: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  emailAddresses: z.array(
    z.object({
      emailAddress: z.string(),
      id: z.string(),
      verification: z
        .object({
          status: z.string(),
        })
        .optional(),
    }),
  ),
  primaryEmailAddressId: z.string().nullable(),
})

const clerkClient = createClerkClient({
  secretKey: CLERK_CONFIG.API_KEYS.SECRET_KEY,
})

async function migrateUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
  const db = drizzle(pool)

  try {
    // 1. Fetch users outside transaction since it's external
    logger.info({
      msg: 'Fetching users from Clerk...',
      event: '[script/migrate-users]',
    })
    const clerkUsers = await clerkClient.users.getUserList()
    const users = clerkUsers.data.map((user) => {
      const parsed = userSchema.parse(user)
      const primaryEmail = parsed.emailAddresses.find(
        (email) => email.id === parsed.primaryEmailAddressId,
      )?.emailAddress

      if (!primaryEmail) {
        throw new Error(`No primary email found for user ${parsed.id}`)
      }

      return {
        id: parsed.id,
        email: primaryEmail,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
      }
    })

    logger.info({
      msg: `Migrating ${users.length} users...`,
      event: '[script/migrate-users]',
    })

    // 2. Start transaction for all DB operations
    await db.transaction(async (tx) => {
      // Insert users
      for (const user of users) {
        await tx
          .insert(userTable)
          .values({
            clerkId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          })
          .onConflictDoNothing()
      }

      // Update references
      logger.info({
        msg: 'Updating references...',
        event: '[script/migrate-users]',
      })
      await tx
        .update(list)
        .set({
          userIdNew: userTable.id,
        })
        .from(userTable)
        .where(eq(list.userId, userTable.clerkId))

      await tx
        .update(note)
        .set({
          userIdNew: userTable.id,
        })
        .from(userTable)
        .where(eq(note.userId, userTable.clerkId))

      await tx
        .update(search)
        .set({
          userIdNew: userTable.id,
        })
        .from(userTable)
        .where(eq(search.userId, userTable.clerkId))

      // Verify all references were updated
      const listCount = await db
        .select({ count: count() })
        .from(list)
        .where(isNull(list.userIdNew))
      const noteCount = await db
        .select({ count: count() })
        .from(note)
        .where(isNull(note.userIdNew))
      const searchCount = await db
        .select({ count: count() })
        .from(search)
        .where(isNull(search.userIdNew))

      logger.info({
        msg: 'Verifying reference updates...',
        event: '[script/migrate-users]',
        metadata: {
          nullListCount: Number(listCount[0].count),
          nullNoteCount: Number(noteCount[0].count),
          nullSearchCount: Number(searchCount[0].count)
        }
      })

      if (
        Number(listCount[0].count) > 0 ||
        Number(noteCount[0].count) > 0 ||
        Number(searchCount[0].count) > 0
      ) {
        logger.error({
          msg: 'Orphaned records found:',
          event: '[script/migrate-users]',
          metadata: {
            listCount,
            noteCount,
            searchCount,
          },
        })
        throw new Error('Some records could not be mapped to new user IDs')
      }

      // 5. Drop old columns and rename new ones
      logger.info({
        msg: 'Finalizing schema changes...',
        event: '[script/migrate-users]',
      })

      // List table changes
      await tx.execute(sql`
        ALTER TABLE "list" DROP COLUMN user_id;
      `)
      await tx.execute(sql`
        ALTER TABLE "list" ALTER COLUMN user_id_new SET NOT NULL;
      `)
      await tx.execute(sql`
        ALTER TABLE "list" RENAME COLUMN user_id_new TO user_id;
      `)

      // Note table changes
      await tx.execute(sql`
        ALTER TABLE "note" DROP COLUMN user_id;
      `)
      await tx.execute(sql`
        ALTER TABLE "note" ALTER COLUMN user_id_new SET NOT NULL;
      `)
      await tx.execute(sql`
        ALTER TABLE "note" RENAME COLUMN user_id_new TO user_id;
      `)

      // Search table changes
      await tx.execute(sql`
        ALTER TABLE "search" DROP COLUMN user_id;
      `)
      await tx.execute(sql`
        ALTER TABLE "search" ALTER COLUMN user_id_new SET NOT NULL;
      `)
      await tx.execute(sql`
        ALTER TABLE "search" RENAME COLUMN user_id_new TO user_id;
      `)

      // 6. Add foreign key constraints
      await tx.execute(sql`
        ALTER TABLE "list" ADD CONSTRAINT "list_user_id_user_id_fk" 
            FOREIGN KEY ("user_id") REFERENCES "user"("id");
      `)

      await tx.execute(sql`
        ALTER TABLE "note" ADD CONSTRAINT "note_user_id_user_id_fk" 
            FOREIGN KEY ("user_id") REFERENCES "user"("id");
      `)

      await tx.execute(sql`
        ALTER TABLE "search" ADD CONSTRAINT "search_user_id_user_id_fk" 
            FOREIGN KEY ("user_id") REFERENCES "user"("id");
      `)
    })

    logger.info({
      msg: 'Migration completed successfully!',
      event: '[script/migrate-users]',
    })
  } catch (error) {
    logger.error({
      msg: 'Migration failed:',
      event: '[script/migrate-users]',
      metadata: { error },
    })
    throw error
  } finally {
    await pool.end()
  }
}

// Ensure CLERK_SECRET_KEY is set
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY environment variable is required')
}

// Script description:
// This script migrates users from Clerk to the database.
// It fetches users from Clerk, inserts them into the database,
// updates references to the old user IDs, and then drops the old columns.
// It also adds foreign key constraints to the database.

// Run command:
// ts-node src/scripts/migrate-users.ts
// Run steps:
// 1. Fetch users outside transaction since it's external
// 2. Start transaction for all DB operations
// 3. Insert users
// 4. Update references
// 5. Drop old columns and rename new ones
// 6. Add foreign key constraints
migrateUsers().catch(console.error)
