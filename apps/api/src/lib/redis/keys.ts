export const REDIS_KEYS = {
  place: (id: string) => `place:${id}`,
  search: (id: string) => `search:${id}`,
} as const
