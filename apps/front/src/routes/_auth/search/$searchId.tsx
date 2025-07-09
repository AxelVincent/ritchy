import { usePlacesQuery } from '@/api/queries/places/usePlaces'
import { ApiErrorDisplay } from '@/components/common/ApiErrorDisplay'
import { LoadingMessages } from '@/components/common/LoadingMessages'
import { MapDisplay } from '@/components/map-display/MapDisplay'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/search/$searchId')({
  loader: async ({ params }) => {
    return {
      searchId: params.searchId,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { searchId } = Route.useLoaderData()
  const { data, isPending, error } = usePlacesQuery({
    operator: 'equals',
    field: 'search.id',
    value: searchId,
  })

  if (isPending) return <LoadingMessages />
  if (error) return <ApiErrorDisplay error={error} />
  if (!data || 'error' in data) return null

  return <MapDisplay key={searchId} places={data.places} searchId={searchId} />
}
