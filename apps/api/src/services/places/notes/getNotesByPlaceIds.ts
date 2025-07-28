import type { Note } from '@ritchy/types'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import { note } from '../../../db/schema'

export const getNotesByPlaceIds = async (userPlaceIds: string[]) => {
  if (userPlaceIds.length === 0) {
    return new Map<string, Array<Note>>()
  }

  const notes = await db
    .select()
    .from(note)
    .where(and(inArray(note.userPlaceId, userPlaceIds)))
    .orderBy(desc(note.createdAt))

  // Process results more efficiently
  return notes.reduce((acc, dbNote) => {
    const formattedNote: Note = {
      id: String(dbNote.id),
      userPlaceId: dbNote.userPlaceId,
      note: dbNote.note,
      userId: dbNote.userId,
      createdAt: dbNote.createdAt.toISOString(),
      updatedAt: dbNote.updatedAt.toISOString(),
    }

    const placeNotes = acc.get(dbNote.userPlaceId) ?? []
    acc.set(dbNote.userPlaceId, [...placeNotes, formattedNote])
    return acc
  }, new Map<string, Array<Note>>())
}
