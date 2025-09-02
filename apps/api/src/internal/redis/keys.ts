export const REDIS_KEYS = {
  enrich: (website: string) => `enrich:${website}`,
  geocode: (placeId: string) => `geocode:${placeId}`,
} as const
