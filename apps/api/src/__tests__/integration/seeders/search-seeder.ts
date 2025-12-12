import type { SearchModel } from '@ritchy/types'
import { search, searchPlace } from '../../../db/schema'
import { getTestDb } from '../setup/test-database'
import { cleanupManager } from '../utils/cleanup-manager'

export interface SearchData {
  keyword: string
  placeName?: string
  model?: SearchModel
  rectangle?: {
    northEast: { latitude: number; longitude: number }
    southWest: { latitude: number; longitude: number }
  }
}

export interface SeededSearch {
  id: string
  keyword: string
  model: SearchModel
}

const DEFAULT_RECTANGLE = {
  northEast: { latitude: 48.9, longitude: 2.5 },
  southWest: { latitude: 48.8, longitude: 2.2 },
}

export const seedSearch = async (
  userId: string,
  data: SearchData,
): Promise<SeededSearch> => {
  const db = getTestDb()
  const searchId = crypto.randomUUID()
  const model = data.model ?? 'BASIC'

  await db.insert(search).values({
    id: searchId,
    userId: userId,
    placeName: data.placeName ?? 'Test Location',
    keyword: data.keyword,
    model: model,
    rectangle: data.rectangle ?? DEFAULT_RECTANGLE,
  })

  cleanupManager.trackSearch(searchId)

  return { id: searchId, keyword: data.keyword, model }
}

export const seedSearchPlace = async (
  searchId: string,
  userPlaceId: string,
): Promise<void> => {
  const db = getTestDb()

  await db.insert(searchPlace).values({
    id: crypto.randomUUID(),
    searchId,
    userPlaceId,
  })
}
