export const REDIS_KEYS = {
  place: (id: string) => `place:${id}`,
  search: (id: string) => `search:${id}`,
  enrich: (website: string) => `enrich:${website}`,
  geocode: (placeId: string) => `geocode:${placeId}`,
} as const
