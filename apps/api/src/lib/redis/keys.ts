export const REDIS_KEYS = {
  place: (id: string) => `place:${id}`,
} as const
