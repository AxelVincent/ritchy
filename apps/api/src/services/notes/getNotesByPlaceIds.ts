import type { Note } from '@ritchy/types'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../db/db'
import { note } from '../../db/schema'

export const getNotesByPlaceIds = async (
  placeIds: string[],
  userId: string,
) => {
  const notes = await db
    .select()
    .from(note)
    .where(and(inArray(note.placeId, placeIds), eq(note.userId, userId)))
    .orderBy(desc(note.createdAt))

  return notes.reduce((acc, note) => {
    const formattedNote = {
      id: note.id,
      place_id: note.placeId,
      note: note.note,
      user_id: note.userId,
      created_at: note.createdAt.toISOString(),
      updated_at: note.updatedAt.toISOString(),
    }

    const placeNotes = acc.get(note.placeId) ?? []
    acc.set(note.placeId, [...placeNotes, formattedNote])
    return acc
  }, new Map<string, Array<Note>>())
}
