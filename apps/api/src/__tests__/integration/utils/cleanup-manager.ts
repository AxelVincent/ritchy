import { inArray } from 'drizzle-orm'
import {
  list,
  listPlace,
  place,
  search,
  searchPlace,
  user,
} from '../../../db/schema'
import { getTestDb } from '../setup/test-database'

class CleanupManager {
  private userIds: string[] = []
  private placeIds: string[] = []
  private listIds: string[] = []
  private searchIds: string[] = []

  trackUser(id: string) {
    this.userIds.push(id)
  }

  trackPlace(id: string) {
    this.placeIds.push(id)
  }

  trackPlaces(ids: string[]) {
    this.placeIds.push(...ids)
  }

  trackList(id: string) {
    this.listIds.push(id)
  }

  trackSearch(id: string) {
    this.searchIds.push(id)
  }

  async cleanup() {
    const db = getTestDb()

    // Delete junction tables first (list_place, search_place)
    // These reference list/search which reference user
    if (this.listIds.length > 0) {
      await db.delete(listPlace).where(inArray(listPlace.listId, this.listIds))
      await db.delete(list).where(inArray(list.id, this.listIds))
      this.listIds = []
    }

    if (this.searchIds.length > 0) {
      await db
        .delete(searchPlace)
        .where(inArray(searchPlace.searchId, this.searchIds))
      await db.delete(search).where(inArray(search.id, this.searchIds))
      this.searchIds = []
    }

    // Users (cascades: userPlace, contacts, notes, status)
    if (this.userIds.length > 0) {
      await db.delete(user).where(inArray(user.id, this.userIds))
      this.userIds = []
    }

    // Places (cascades: enrichment and all children)
    if (this.placeIds.length > 0) {
      await db.delete(place).where(inArray(place.id, this.placeIds))
      this.placeIds = []
    }
  }
}

export const cleanupManager = new CleanupManager()
