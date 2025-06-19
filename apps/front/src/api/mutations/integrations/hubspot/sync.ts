import { useApiMutation } from '@/hooks/useApi'
import type { SyncPlaceApiResponse, SyncPlaceBody } from '@ritchy/types'

export const useHubspotSyncPlace = () => {
  return useApiMutation<SyncPlaceApiResponse, SyncPlaceBody>(
    '/hubspot/sync/places',
    {
      method: 'POST',
    },
  )
}
