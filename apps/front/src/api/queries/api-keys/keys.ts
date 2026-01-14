export type ApiActivityFilters = {
  page?: number
  pageSize?: number
  keyId?: string
  statusCode?: number
}

export const apiKeysKeys = {
  all: ['api-keys'] as const,
  list: () => [...apiKeysKeys.all, 'list'] as const,
  usage: () => [...apiKeysKeys.all, 'usage'] as const,
  secret: (id: string) => [...apiKeysKeys.all, 'secret', id] as const,
  activity: (filters?: ApiActivityFilters) =>
    [...apiKeysKeys.all, 'activity', filters] as const,
}
