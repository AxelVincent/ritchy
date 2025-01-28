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

  return notes.reduce((acc, dbNote) => {
    const formattedNote: Note = {
      id: String(dbNote.id),
      placeId: dbNote.placeId,
      note: dbNote.note,
      userId: dbNote.userId,
      createdAt: dbNote.createdAt.toISOString(),
      updatedAt: dbNote.updatedAt.toISOString(),
    }

    const placeNotes = acc.get(dbNote.placeId) ?? []
    acc.set(dbNote.placeId, [...placeNotes, formattedNote])
    return acc
  }, new Map<string, Array<Note>>())
}
