import type { Response } from 'supertest'
import request from 'supertest'
import { getTestApp } from '../setup/test-server'

interface ApiClient {
  userPlaces: {
    get: (filters?: Record<string, unknown>) => Promise<Response>
    filterOptions: (params?: {
      listId?: string
      searchId?: string
    }) => Promise<Response>
    markers: (filters?: Record<string, unknown>) => Promise<Response>
  }
}

export const createApiClient = (userId: string): ApiClient => {
  const app = getTestApp()

  return {
    userPlaces: {
      async get(filters: Record<string, unknown> = {}): Promise<Response> {
        const query = new URLSearchParams()

        for (const [key, value] of Object.entries(filters)) {
          if (Array.isArray(value)) {
            for (const v of value) {
              query.append(key, String(v))
            }
          } else if (value !== undefined) {
            query.append(key, String(value))
          }
        }

        return request(app)
          .get(`/user-places?${query}`)
          .set('X-Test-User-Id', userId)
      },

      async filterOptions(
        params: { listId?: string; searchId?: string } = {},
      ): Promise<Response> {
        const query = new URLSearchParams()

        if (params.listId) {
          query.append('listId', params.listId)
        }
        if (params.searchId) {
          query.append('searchId', params.searchId)
        }

        return request(app)
          .get(`/user-places/filter-options?${query}`)
          .set('X-Test-User-Id', userId)
      },

      async markers(filters: Record<string, unknown> = {}): Promise<Response> {
        const query = new URLSearchParams()

        for (const [key, value] of Object.entries(filters)) {
          if (Array.isArray(value)) {
            for (const v of value) {
              query.append(key, String(v))
            }
          } else if (value !== undefined) {
            query.append(key, String(value))
          }
        }

        return request(app)
          .get(`/user-places/markers?${query}`)
          .set('X-Test-User-Id', userId)
      },
    },
  }
}
